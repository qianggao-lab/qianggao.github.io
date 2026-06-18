# qianggao.github.io

Personal academic website of **Qiang Gao** — postdoctoral fellow in physics at Harvard University.

Static site (HTML + CSS + a little vanilla JS), no build step. Served by GitHub Pages.

## Structure

| File | Page |
| --- | --- |
| `index.html` | Home — bio, background, research focus, recent publications |
| `research.html` | Research interests |
| `publications.html` | Full publication list |
| `cv.html` | Embedded / downloadable CV |
| `notes.html` + `notes/` | Notes |
| `gallery.html` | Photo gallery (lightbox) |
| `style.css` | Design system (light + dark themes) |
| `assets/js/site.js` | Theme toggle, mobile nav, gallery lightbox |

## Local preview

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```
