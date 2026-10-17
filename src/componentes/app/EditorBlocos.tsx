"use client";
/**
 * Editor de blocos estilo Notion (BlockNote): "/" abre o menu de blocos
 * (titulo, lista, tarefa, tabela, citacao, codigo, imagem por link),
 * arrastar pela alca reordena, Markdown digitado vira formatacao.
 *
 * So existe no navegador; as paginas carregam com next/dynamic ssr:false.
 * Salva com atraso de 700ms depois da ultima tecla: um PATCH por pausa,
 * nao um por letra.
 */
import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { pt } from "@blocknote/core/locales";
import "@blocknote/mantine/style.css";

export interface MudancaEditor { conteudo: unknown[]; texto: string }

function textoPuro(blocos: any[]): string {
  const partes: string[] = [];
  const andar = (bs: any[]) => {
    for (const b of bs ?? []) {
      const c = b.content;
      if (Array.isArray(c)) partes.push(c.map((x: any) => x.text ?? (x.content ?? []).map((y: any) => y.text ?? "").join("")).join(""));
      else if (c?.type === "tableContent") for (const r of c.rows ?? []) for (const cel of r.cells ?? []) partes.push((Array.isArray(cel) ? cel : cel?.content ?? []).map((x: any) => x.text ?? "").join(""));
      if (b.children?.length) andar(b.children);
    }
  };
  andar(blocos);
  return partes.filter(Boolean).join("\n");
}

export default function EditorBlocos({ inicial, aoMudar, editavel = true }:
  { inicial: unknown[]; aoMudar: (m: MudancaEditor) => void; editavel?: boolean }) {
  const editor = useCreateBlockNote({
    initialContent: Array.isArray(inicial) && inicial.length ? (inicial as any) : undefined,
    dictionary: pt,
  });
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef(aoMudar);
  ultimo.current = aoMudar;
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const f = () => setEscuro(document.documentElement.dataset.tema === "dark" || (document.documentElement.dataset.tema !== "light" && m.matches));
    f(); m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  // Sai da pagina com mudanca pendente: salva na hora, nao perde a ultima frase.
  useEffect(() => () => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      ultimo.current({ conteudo: editor.document as unknown[], texto: textoPuro(editor.document as any[]) });
    }
  }, [editor]);

  return (
    <div className="editor-notas">
      <BlockNoteView
        editor={editor}
        editable={editavel}
        theme={escuro ? "dark" : "light"}
        onChange={() => {
          if (temporizador.current) clearTimeout(temporizador.current);
          temporizador.current = setTimeout(() => {
            temporizador.current = null;
            ultimo.current({ conteudo: editor.document as unknown[], texto: textoPuro(editor.document as any[]) });
          }, 700);
        }}
      />
    </div>
  );
}
