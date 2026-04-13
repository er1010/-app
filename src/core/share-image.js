function wrapText(ctx, text, maxWidth) {
  const words = String(text ?? "").split("");
  const lines = [];
  let current = "";

  words.forEach((char) => {
    const trial = current + char;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = trial;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

async function loadImage(url) {
  if (!url) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function downloadResultShareImage({ result, imageUrl }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 52px 'Microsoft YaHei', sans-serif";
  ctx.fillText("SBTI 人格测试结果", 80, 120);

  ctx.font = "34px 'Microsoft YaHei', sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText("仅供娱乐分享", 80, 178);

  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, 60, 240, 960, 1560, 36);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "bold 68px 'Microsoft YaHei', sans-serif";
  ctx.fillText(`${result.finalType.code}（${result.finalType.cn}）`, 110, 360);

  ctx.font = "36px 'Microsoft YaHei', sans-serif";
  ctx.fillStyle = "#374151";
  ctx.fillText(result.badge, 110, 430);

  const poster = await loadImage(imageUrl).catch(() => null);
  if (poster) {
    const posterWidth = 520;
    const posterHeight = 520;
    ctx.save();
    drawRoundedRect(ctx, 280, 490, posterWidth, posterHeight, 24);
    ctx.clip();
    ctx.drawImage(poster, 280, 490, posterWidth, posterHeight);
    ctx.restore();
  }

  const noteY = poster ? 1060 : 560;
  ctx.fillStyle = "#1f2937";
  ctx.font = "32px 'Microsoft YaHei', sans-serif";
  const noteLines = wrapText(ctx, result.note, 860);
  noteLines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 110, noteY + index * 50);
  });

  const introStartY = noteY + noteLines.slice(0, 3).length * 50 + 40;
  ctx.fillStyle = "#4b5563";
  ctx.font = "30px 'Microsoft YaHei', sans-serif";
  const introLines = wrapText(ctx, result.finalType.intro, 860);
  introLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, 110, introStartY + index * 44);
  });

  const descStartY = introStartY + 2 * 44 + 20;
  ctx.fillStyle = "#475569";
  ctx.font = "28px 'Microsoft YaHei', sans-serif";
  const descLines = wrapText(ctx, result.finalType.desc, 860);
  descLines.slice(0, 8).forEach((line, index) => {
    ctx.fillText(line, 110, descStartY + index * 40);
  });

  const link = document.createElement("a");
  link.download = `sbti-${result.finalType.code}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
