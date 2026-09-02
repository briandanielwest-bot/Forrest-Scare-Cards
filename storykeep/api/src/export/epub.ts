import archiver from "archiver";
import crypto from "crypto";
import { BRAND } from "../brand";
import { compile, paragraphs, type CompiledBook } from "./model";

/**
 * EPUB 3, assembled by hand.
 *
 * An epub is a zip with a strict shape: `mimetype` must be the first entry and
 * must be stored uncompressed, or e-readers reject the file with an error that
 * tells you nothing. Hand-rolling it is about 150 lines and removes a
 * dependency from the one code path a paying customer touches last.
 */
export async function renderEpub(bookId: string): Promise<Buffer> {
  const c = await compile(bookId);
  const uuid = crypto.randomUUID();
  const chapters = chapterFiles(c);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });

  archive.append("application/epub+zip", { name: "mimetype", store: true });
  archive.append(CONTAINER_XML, { name: "META-INF/container.xml" });
  archive.append(STYLESHEET, { name: "OEBPS/style.css" });
  archive.append(opf(c, uuid, chapters), { name: "OEBPS/content.opf" });
  archive.append(nav(c, chapters), { name: "OEBPS/nav.xhtml" });
  for (const ch of chapters) {
    archive.append(ch.xhtml, { name: `OEBPS/${ch.file}` });
  }

  await archive.finalize();
  return done;
}

interface ChapterFile {
  id: string;
  file: string;
  title: string;
  xhtml: string;
}

function chapterFiles(c: CompiledBook): ChapterFile[] {
  const files: ChapterFile[] = [];

  const titleBody = [
    `<h1 class="title">${esc(c.frontMatter.title)}</h1>`,
    c.frontMatter.subtitle ? `<p class="subtitle">${esc(c.frontMatter.subtitle)}</p>` : "",
    c.frontMatter.byline ? `<p class="byline">${esc(c.frontMatter.byline)}</p>` : "",
    c.frontMatter.dedication ? `<p class="dedication">${esc(c.frontMatter.dedication)}</p>` : "",
    c.frontMatter.epigraph
      ? `<blockquote class="epigraph"><p>${esc(c.frontMatter.epigraph)}</p></blockquote>`
      : "",
    c.frontMatter.authorNote
      ? `<h2>A note from the author</h2><p>${esc(c.frontMatter.authorNote)}</p>`
      : "",
  ].join("\n");
  files.push({ id: "titlepage", file: "titlepage.xhtml", title: "Title", xhtml: page("Title", titleBody) });

  if (c.genre.illustrated) {
    c.spreads.forEach((spread, i) => {
      const body = [
        spread.imageUrl ? `<p class="art"><img src="${esc(spread.imageUrl)}" alt=""/></p>` : "",
        spread.text.trim() ? `<p class="spread">${esc(spread.text.trim())}</p>` : "",
      ].join("\n");
      files.push({
        id: `spread${i + 1}`,
        file: `spread${i + 1}.xhtml`,
        title: `Spread ${i + 1}`,
        xhtml: page(`Spread ${i + 1}`, body),
      });
    });
  } else {
    c.sections.forEach((section, i) => {
      const body = [
        `<h2>${esc(section.title)}</h2>`,
        ...paragraphs(section.body).map((p) => `<p>${esc(p)}</p>`),
      ].join("\n");
      files.push({
        id: `chapter${i + 1}`,
        file: `chapter${i + 1}.xhtml`,
        title: section.title,
        xhtml: page(section.title, body),
      });
    });
  }

  files.push({
    id: "colophon",
    file: "colophon.xhtml",
    title: "Colophon",
    xhtml: page("Colophon", `<p class="colophon">${esc(BRAND.colophon)}</p>`),
  });

  return files;
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const STYLESHEET = `body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.55; margin: 1em; }
h1.title { font-size: 1.9em; text-align: center; margin-top: 3em; }
p.subtitle { text-align: center; font-style: italic; }
p.byline { text-align: center; margin-top: 2em; }
p.dedication, blockquote.epigraph { text-align: center; font-style: italic; margin-top: 3em; }
h2 { font-size: 1.3em; margin-top: 2em; }
p { text-indent: 1.2em; margin: 0 0 0.2em; text-align: justify; }
p:first-of-type, p.spread, p.dedication, p.byline, p.subtitle, p.colophon { text-indent: 0; }
p.spread { text-align: center; font-size: 1.15em; text-indent: 0; margin: 1.5em 0; }
p.art { text-align: center; margin: 0; }
p.art img { max-width: 100%; }
p.colophon { text-align: center; font-size: 0.85em; margin-top: 4em; }`;

function page(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>`;
}

function opf(c: CompiledBook, uuid: string, chapters: ChapterFile[]): string {
  const manifest = chapters
    .map((ch) => `    <item id="${ch.id}" href="${ch.file}" media-type="application/xhtml+xml"/>`)
    .join("\n");
  const spine = chapters.map((ch) => `    <itemref idref="${ch.id}"/>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${esc(c.frontMatter.title)}</dc:title>
    <dc:creator>${esc(c.frontMatter.byline || c.authorName)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:publisher>${esc(BRAND.name)}</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
${manifest}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`;
}

function nav(c: CompiledBook, chapters: ChapterFile[]): string {
  const items = chapters
    .map((ch) => `      <li><a href="${ch.file}">${esc(ch.title)}</a></li>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
