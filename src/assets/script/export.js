import PptxGenJS from "pptxgenjs";

async function svgToPngBase64(svgString, width, height) {
  return new Promise((resolve) => {
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = url;
  });
}
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
const getSvgContent = (pageData, width, height) => {
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  // Shapes
  pageData.drawing.shapes?.forEach((shape) => {
    let fillAttr = shape.fill;

    // If gradient exists, create linear gradient
    if (shape.gradientFrom && shape.gradientTo) {
      const gradientId = `grad-${shape.id || idx}`;
      svgContent += `<defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${shape.gradientFrom}" />
        <stop offset="100%" stop-color="${shape.gradientTo}" />
      </linearGradient>
    </defs>`;
      fillAttr = `url(#${gradientId})`;
    }
    switch (shape.type) {
      case "rect":
        svgContent += `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fillAttr}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />`;
        break;
      case "circle":
        svgContent += `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}" fill="${fillAttr}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />`;
        break;
      case "triangle":
        const radius = Math.max(shape.width, shape.height) / 2;
        const points = [
          [shape.x, shape.y - radius],
          [shape.x - radius, shape.y + radius],
          [shape.x + radius, shape.y + radius],
        ]
          .map((p) => p.join(","))
          .join(" ");
        svgContent += `<polygon points="${points}" fill="${fillAttr}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" transform="rotate(${shape.rotation},${shape.x},${shape.y})" />`;
        break;
      case "arrow":
        const [x0, y0, x1, y1] = shape.points;
        const markerId = `arrowhead-${shape.id}`;

        // Use Konva defaults if not provided

        const arrowhead = shape.strokeWidth > 4 ? 3 : shape.strokeWidth;
        // SVG marker scales with strokeWidth to match Konva
        svgContent += `<defs>
                            <marker
                              id="${markerId}"
                              markerWidth="${arrowhead}"
                              markerHeight="${arrowhead}"
                              refX="${arrowhead - arrowhead / 2}"
                              refY="${arrowhead / 2}"
                              orient="auto"
                              markerUnits="strokeWidth"
                            >
                              <polygon 
                                points="0,0 ${arrowhead},${arrowhead / 2} 0,${arrowhead}" 
                                fill="${shape.stroke}" 
                              />
                            </marker>
                          </defs>
                          `;

        // Draw line with marker-end
        svgContent += `<line
                                x1="${shape.x + x0}"
                                y1="${shape.y + y0}"
                                x2="${shape.x + x1}"
                                y2="${shape.y + y1}"
                                stroke="${shape.stroke}"
                                stroke-width="${shape.strokeWidth}"
                                marker-end="url(#${markerId})"
                              />`;
        break;
    }
  });

  // Lines
  pageData.drawing.lines?.forEach((line) => {
    const points = [];
    for (let i = 0; i < line.points.length; i += 2) {
      points.push(`${line.points[i]},${line.points[i + 1]}`);
    }
    svgContent += `<polyline points="${points.join(" ")}" stroke="${line.color}" stroke-width="${line.size}" fill="none" stroke-linecap="${
      line.lineCap
    }" ${line.dash ? `stroke-dasharray="${line.dash.join(",")}"` : ""} />`;
  });

  // Texts
  pageData.drawing.texts?.forEach((txt) => {
    svgContent += `<text x="${txt.x}" y="${txt.y}" font-family="${txt.fontFamily}" font-size="${txt.fontSize}" fill="${txt.color}">${txt.text}</text>`;
  });
  //  Images
  pageData.drawing.images?.forEach((img) => {
    svgContent += `<image href="${img.src}" x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" />`;
  });
  svgContent += `</svg>`;

  return svgContent;
};
export const exportProjectPPTXImage = async (saved, projectName, width, height) => {
  const pptx = new PptxGenJS();
  const sortedPages = [...saved].sort((a, b) => a.page - b.page);
  for (const pageData of sortedPages) {
    const slide = pptx.addSlide();

    const svgContent = getSvgContent(pageData, width, height);

    // Convert SVG to PNG base64
    const pngDataUrl = await svgToPngBase64(svgContent, width, height);

    // Add image to slide
    slide.addImage({
      data: pngDataUrl,
      x: 0,
      y: 0,
      w: width / 96, // Convert px to inches (assuming 96 DPI)
      h: height / 96,
    });
  }
  await pptx.writeFile({ fileName: `${projectName || "Project"}.pptx` });
};

export const exportProjectPPTX = async (saved, projectName) => {
  const PX_TO_INCH = 96; // standard screen DPI
  const PX_TO_PT = 72 / PX_TO_INCH; // px -> points (1pt = 72/inch)

  const pptx = new PptxGenJS();
  const sortedPages = [...saved].sort((a, b) => a.page - b.page);

  for (const pageData of sortedPages) {
    const slide = pptx.addSlide();

    // -----------------------
    // Shapes (rect/circle/triangle)
    // -----------------------
    pageData.drawing.shapes?.forEach((shape) => {
      const x = (shape.x || 0) / PX_TO_INCH;
      const y = (shape.y || 0) / PX_TO_INCH;
      const strokeWidth = Math.max(1, shape.strokeWidth || 1);
      let fill;
      if (shape.gradientFrom && shape.gradientTo) {
        fill = {
          type: "linear",
          angle: 0, // 0 = left→right, 90 = top→bottom
          colorStops: [
            { pos: 0, color: shape.gradientFrom },
            { pos: 100, color: shape.gradientTo },
          ],
        };
      } else {
        fill = { color: shape.fill || "FFFFFF" };
      }

      switch (shape.type) {
        case "rect":
          slide.addShape(pptx.shapes.RECTANGLE, {
            x,
            y,
            w: (shape.width || 0) / PX_TO_INCH,
            h: (shape.height || 0) / PX_TO_INCH,
            fill,
            line: { color: shape.stroke || "000000", width: strokeWidth },
          });
          break;

        case "circle":
          slide.addShape(pptx.shapes.OVAL, {
            x: (shape.x - shape.radius) / PX_TO_INCH,
            y: (shape.y - shape.radius) / PX_TO_INCH,
            w: (shape.radius * 2) / PX_TO_INCH,
            h: (shape.radius * 2) / PX_TO_INCH,
            fill,
            line: { color: shape.stroke || "000000", width: strokeWidth },
          });
          break;

        case "triangle":
          slide.addShape(pptx.shapes.ISOSCELES_TRIANGLE, {
            x,
            y,
            w: (shape.width || 0) / PX_TO_INCH,
            h: (shape.height || 0) / PX_TO_INCH,
            fill: { color: shape.fill || "FFFFFF" },
            line: { color: shape.stroke || "000000", width: strokeWidth },
            rotate: shape.rotation || 0,
          });
          break;

        // arrow handled below (keeps direction & works with points or x/x2)
        case "arrow": {
          // determine start/end coordinates (absolute canvas px)
          let sx, sy, ex, ey;
          if (shape.points && shape.points.length >= 4) {
            // Konva Arrow usually stores last segment in shape.points
            const [x0, y0, x1, y1] = shape.points;
            sx = (shape.x || 0) + x0;
            sy = (shape.y || 0) + y0;
            ex = (shape.x || 0) + x1;
            ey = (shape.y || 0) + y1;
          } else if (shape.x2 !== undefined && shape.y2 !== undefined) {
            sx = shape.x;
            sy = shape.y;
            ex = shape.x2;
            ey = shape.y2;
          } else {
            // fallback: use width/height as delta from x,y
            sx = shape.x || 0;
            sy = shape.y || 0;
            ex = sx + (shape.width || 0);
            ey = sy + (shape.height || 0);
          }

          // Convert to PPT coords (in inches) keeping sign (so direction preserved)
          const px = sx / PX_TO_INCH;
          const py = sy / PX_TO_INCH;
          const w = (ex - sx) / PX_TO_INCH;
          const h = (ey - sy) / PX_TO_INCH;

          // Use pptx.shapes.LINE with x,y,w,h — keep w/h sign, pptx handles direction
          slide.addShape(pptx.shapes.LINE, {
            x: px,
            y: py,
            w,
            h,
            line: {
              color: shape.stroke || "000000",
              width: Math.max(1, shape.strokeWidth || 1),
              endArrowType: shape.endArrowType || "triangle",
            },
          });
          break;
        }
      }
    });

    // -----------------------
    // Lines (multi-point polyline)
    // -----------------------
    pageData.drawing.lines?.forEach((line) => {
      const pts = line.points;
      if (!pts || pts.length < 4) return;
      for (let i = 0; i < pts.length - 2; i += 2) {
        const x1 = pts[i] / PX_TO_INCH;
        const y1 = pts[i + 1] / PX_TO_INCH;
        const dx = (pts[i + 2] - pts[i]) / PX_TO_INCH;
        const dy = (pts[i + 3] - pts[i + 1]) / PX_TO_INCH;

        slide.addShape(pptx.shapes.LINE, {
          x: x1,
          y: y1,
          w: dx,
          h: dy,
          line: {
            color: line.color || "000000",
            width: Math.max(1, line.size || 1),
            dashType: line.dash ? "sysDot" : "solid",
          },
        });
      }
    });

    // -----------------------
    // Texts (position + alignment fixes)
    // -----------------------
    pageData.drawing.texts?.forEach((txt) => {
      const fontPx = txt.fontSize || 16; // canvas px
      const fontPt = Math.max(8, Math.round(fontPx * PX_TO_PT)); // convert px -> pt
      // Estimate width/height in px if not provided
      const estWidthPx = txt.width || Math.max(40, (txt.text?.length || 1) * (fontPx * 0.6));
      const estHeightPx = txt.height || Math.max(fontPx * 1.2, fontPt * (96 / 72)); // fallback

      let x = (txt.x || 0) / PX_TO_INCH;
      let y = (txt.y || 0) / PX_TO_INCH;
      const w = estWidthPx / PX_TO_INCH;
      const h = estHeightPx / PX_TO_INCH;

      // handle horizontal alignment (canvas -> pptx)
      const align = txt.align || "left";
      if (align === "center") x = x - w / 2;
      if (align === "right") x = x - w;

      // handle baseline / vertical alignment
      // Canvas text may be drawn with baseline 'middle' or 'bottom'. Try to infer.
      const textBaseline = txt.textBaseline || txt.valign || "top"; // user data may contain this
      if (textBaseline === "middle" || textBaseline === "center") {
        y = y - h / 2;
      } else if (textBaseline === "bottom") {
        y = y - h;
      } // default: top -> no change

      slide.addText(txt.text || "", {
        x,
        y,
        w,
        h,
        fontSize: fontPt,
        fontFace: txt.fontFamily || "Arial",
        color: txt.color || "000000",
        align,
        valign: textBaseline === "bottom" ? "bottom" : textBaseline === "middle" ? "middle" : "top",
        bold: !!txt.bold,
        italic: !!txt.italic,
      });
    });

    // -----------------------
    // Images (blob or url)
    // -----------------------
    if (pageData.drawing.images?.length) {
      for (const img of pageData.drawing.images) {
        let imgSrc = img.src;
        if (img.src instanceof Blob || img.src instanceof File) {
          imgSrc = await blobToBase64(img.src);
        }
        slide.addImage({
          x: (img.x || 0) / PX_TO_INCH,
          y: (img.y || 0) / PX_TO_INCH,
          w: (img.width || 100) / PX_TO_INCH,
          h: (img.height || 100) / PX_TO_INCH,
          data: imgSrc, // use data for base64
        });
      }
    }
  }

  await pptx.writeFile({ fileName: `${projectName || "Project"}.pptx` });
};

export const exportToSvg = (saved, projectName, width, height) => {
  saved.forEach((pageData) => {
    // Start SVG string
    const svgContent = getSvgContent(pageData, width, height);
    // Create blob & trigger download
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}-${pageData.page}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};
