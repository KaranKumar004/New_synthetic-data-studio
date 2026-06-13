"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Download, Sliders, Eye, RefreshCw, Layers, ShieldAlert, CheckCircle2, 
  Image as ImageIcon, Grid, Binary, Brain, AlertTriangle, QrCode, Heart, Shield, HelpCircle,
  TrendingUp, CircleDot, Info
} from "lucide-react";
import { api } from "@/lib/api";

interface ImageDatasetGeneratorProps {
  user: any;
}

interface DatasetCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  classes: string[];
  totalClasses: number;
}

const CATEGORIES: DatasetCategory[] = [
  {
    id: "shapes",
    name: "Geometric Shapes",
    description: "Ideal for basic object detection and shape classification tasks. Generates circles, squares, and triangles.",
    icon: CircleDot,
    classes: ["circle", "square", "triangle"],
    totalClasses: 3,
  },
  {
    id: "ocr",
    name: "Noisy OCR Digits",
    description: "Simulated handwriting/machine-printed character recognition (0-9) with randomized fonts and rotations.",
    icon: Binary,
    classes: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    totalClasses: 10,
  },
  {
    id: "colors",
    name: "Color & Patterns",
    description: "Classification patterns containing solid colors, linear gradients, and high-contrast checkerboards.",
    icon: Grid,
    classes: ["solid", "gradient", "checkerboard"],
    totalClasses: 3,
  },
  {
    id: "barcodes",
    name: "Barcodes & QRs",
    description: "Scanner automation dataset. Renders realistic vertical barcodes and QR codes with marker matrices.",
    icon: QrCode,
    classes: ["barcode", "qr_code"],
    totalClasses: 2,
  },
  {
    id: "signs",
    name: "Traffic Signs",
    description: "Autonomous driving asset training. Generates STOP octagons, YIELD triangles, and Speed Limit circles.",
    icon: Shield,
    classes: ["stop", "yield", "speed_limit"],
    totalClasses: 3,
  },
  {
    id: "captcha",
    name: "CAPTCHA / Text",
    description: "Distorted uppercase text sequences rendered with random rotations, noise lines, and background speckles.",
    icon: Sparkles,
    classes: ["4_characters", "5_characters", "6_characters"],
    totalClasses: 3,
  },
  {
    id: "plates",
    name: "License Plates",
    description: "Vehicle scanner LPR dataset. Generates US white plates, UK yellow plates, and EU blue plates.",
    icon: Layers,
    classes: ["white_plate", "yellow_plate", "blue_plate"],
    totalClasses: 3,
  },
  {
    id: "digital",
    name: "Digital Displays",
    description: "IoT meter digit reading. Renders 7-segment active/inactive LED outlines for numbers 0-9.",
    icon: Binary,
    classes: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    totalClasses: 10,
  },
  {
    id: "aruco",
    name: "ArUco Markers",
    description: "Camera calibration and AR tracking markers. Generates high-contrast binary checkerboard marker tags.",
    icon: QrCode,
    classes: ["marker_id_0", "marker_id_1", "marker_id_2"],
    totalClasses: 3,
  },
  {
    id: "ecg",
    name: "ECG Waveforms",
    description: "Medical signal analytics. Plots sinus heart rate baseline grids vs arrhythmia spikes and fibrillation waves.",
    icon: Heart,
    classes: ["normal", "arrhythmia", "v_fib"],
    totalClasses: 3,
  },
  {
    id: "chess",
    name: "Chessboard Grids",
    description: "Camera checker scanning. Alternates board blocks with scattered active pieces or checkmate warnings.",
    icon: Grid,
    classes: ["empty_board", "active_game", "checkmate"],
    totalClasses: 3,
  },
];

export default function ImageDatasetGenerator({ user }: ImageDatasetGeneratorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("shapes");
  const [selectedClass, setSelectedClass] = useState<string>("circle");
  const [numImages, setNumImages] = useState<number>(50);
  const [imageSize, setImageSize] = useState<number>(128);
  const [noiseLevel, setNoiseLevel] = useState<string>("low");
  const [splitRatio, setSplitRatio] = useState<number>(0.8);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaUsedThisMonth, setQuotaUsedThisMonth] = useState<number>(0);
  const [maxRowsLimit, setMaxRowsLimit] = useState<number>(10000);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Fetch current user quota info
  useEffect(() => {
    fetchQuotaInfo();
  }, []);

  const fetchQuotaInfo = async () => {
    try {
      const usage = await api.getProfile();
      setQuotaUsedThisMonth(usage.rows_generated_this_month || 0);
      setMaxRowsLimit(usage.max_rows_limit || 10000);
      setQuotaRemaining(Math.max(0, usage.max_rows_limit - usage.rows_generated_this_month));
    } catch (err) {
      console.error("Failed to load quota details", err);
    }
  };

  const currentCategory = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];
  const numClasses = currentCategory.totalClasses;
  const totalGenerationCount = numImages * numClasses;
  const isQuotaExceeded = quotaRemaining !== null && totalGenerationCount > quotaRemaining;

  // Whenever selector config changes, redraw preview
  useEffect(() => {
    // Make sure we select a class that belongs to the active category
    if (!currentCategory.classes.includes(selectedClass)) {
      setSelectedClass(currentCategory.classes[0]);
    }
    drawPreview();
  }, [selectedCategory, selectedClass, noiseLevel]);

  // Redraw preview manually helper
  const handleRegeneratePreview = () => {
    drawPreview();
  };

  // HTML5 Canvas Preview Drawing Engine
  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 256; // Fixed size for preview canvas
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // 1. Draw category specific images
    switch (selectedCategory) {
      case "shapes":
        drawShapePreview(ctx, size, selectedClass);
        break;
      case "ocr":
        drawOcrPreview(ctx, size, selectedClass);
        break;
      case "colors":
        drawColorsPreview(ctx, size, selectedClass);
        break;
      case "mri":
        drawMriPreview(ctx, size, selectedClass === "tumor");
        break;
      case "defects":
        drawDefectsPreview(ctx, size, selectedClass === "defect");
        break;
      case "barcodes":
        drawBarcodesPreview(ctx, size, selectedClass === "qr_code");
        break;
      case "cells":
        drawCellsPreview(ctx, size, selectedClass === "sickle_cell");
        break;
      case "signs":
        drawSignsPreview(ctx, size, selectedClass);
        break;
      case "satellite":
        drawSatellitePreview(ctx, size, selectedClass);
        break;
      case "captcha":
        drawCaptchaPreview(ctx, size, selectedClass);
        break;
      case "plates":
        drawLicensePlatePreview(ctx, size, selectedClass);
        break;
      case "digital":
        drawDigitalDigitPreview(ctx, size, selectedClass);
        break;
      case "aruco":
        drawArucoMarkerPreview(ctx, size, selectedClass);
        break;
      case "ecg":
        drawEcgWaveformPreview(ctx, size, selectedClass);
        break;
      case "chess":
        drawChessBoardPreview(ctx, size, selectedClass);
        break;
    }

    // 2. Add noise overlays
    applyNoiseOverlay(ctx, size, noiseLevel);
  };

  const drawShapePreview = (ctx: CanvasRenderingContext2D, size: number, shape: string) => {
    // Random bg
    ctx.fillStyle = "#12141c";
    ctx.fillRect(0, 0, size, size);

    // Shape attributes
    ctx.fillStyle = "#3b82f6";
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 4;

    const pad = size * 0.2;
    const w = size * 0.6;
    const h = size * 0.6;

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, w / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (shape === "square") {
      ctx.fillRect(pad, pad, w, h);
      ctx.strokeRect(pad, pad, w, h);
    } else { // triangle
      ctx.beginPath();
      ctx.moveTo(size / 2, pad);
      ctx.lineTo(pad, pad + h);
      ctx.lineTo(pad + w, pad + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawOcrPreview = (ctx: CanvasRenderingContext2D, size: number, digit: string) => {
    // Dark chalkboard background
    ctx.fillStyle = "#1e1e24";
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    // Add small random rotation for visual demonstration
    const angle = (Math.random() * 20 - 10) * Math.PI / 180;
    ctx.rotate(angle);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 120px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(digit, 0, 0);
    ctx.restore();
  };

  const drawColorsPreview = (ctx: CanvasRenderingContext2D, size: number, pattern: string) => {
    if (pattern === "solid") {
      ctx.fillStyle = "#ec4899"; // bright pink
      ctx.fillRect(0, 0, size, size);
    } else if (pattern === "gradient") {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, "#4f46e5"); // indigo
      grad.addColorStop(1, "#06b6d4"); // cyan
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    } else { // checkerboard
      const numBlocks = 8;
      const bSize = size / numBlocks;
      for (let x = 0; x < numBlocks; x++) {
        for (let y = 0; y < numBlocks; y++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#1e293b" : "#f1f5f9";
          ctx.fillRect(x * bSize, y * bSize, bSize, bSize);
        }
      }
    }
  };

  const drawMriPreview = (ctx: CanvasRenderingContext2D, size: number, hasTumor: boolean) => {
    // Black background
    ctx.fillStyle = "#020205";
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const rx = size * 0.36;
    const ry = size * 0.42;

    // Skull ring
    ctx.strokeStyle = "#a1a1aa";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Brain tissue hemispheres
    ctx.fillStyle = "#3f3f46";
    ctx.beginPath();
    ctx.ellipse(cx + 2, cy, rx * 0.85, ry * 0.85, 0, -Math.PI/2, Math.PI/2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy, rx * 0.85, ry * 0.85, 0, Math.PI/2, 3*Math.PI/2);
    ctx.fill();

    // Ventricles (dark central butterfly)
    ctx.fillStyle = "#09090b";
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy, 14, 25, 0, 0, 2 * Math.PI);
    ctx.ellipse(cx + 12, cy, 14, 25, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Symmetrical gyri arcs
    ctx.strokeStyle = "#52525b";
    ctx.lineWidth = 1.5;
    const gyriOffsets = [
      { dx: 30, dy: -60, r: 10 },
      { dx: -30, dy: -60, r: 10 },
      { dx: 50, dy: -20, r: 12 },
      { dx: -50, dy: -20, r: 12 },
      { dx: 40, dy: 40, r: 15 },
      { dx: -40, dy: 40, r: 15 },
    ];
    gyriOffsets.forEach(g => {
      ctx.beginPath();
      ctx.arc(cx + g.dx, cy + g.dy, g.r, 0, 2 * Math.PI);
      ctx.stroke();
    });

    if (hasTumor) {
      // Swelling edema halo (dim light white circle)
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(cx + 40, cy - 30, 32, 0, 2 * Math.PI);
      ctx.fill();

      // Irregular Tumor polygon
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      const tx = cx + 40;
      const ty = cy - 30;
      const tr = 18;
      const numPts = 6;
      for (let k = 0; k < numPts; k++) {
        const ang = k * (2 * Math.PI / numPts);
        const radius = tr * (0.8 + Math.random() * 0.4);
        const px = tx + radius * Math.cos(ang);
        const py = ty + radius * Math.sin(ang);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Necrotic core
      ctx.fillStyle = "#71717a";
      ctx.beginPath();
      ctx.arc(tx + 2, ty - 2, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Add scanlines
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Patient info details text overlay
    ctx.fillStyle = "#71717a";
    ctx.font = "bold 9px monospace";
    ctx.fillText("PAT: SDS-MOCK", 10, 20);
    ctx.fillText("SEQ: T2-FLAIR", 10, 32);
    ctx.fillText("SL: 42/90", 10, size - 12);
  };

  const drawDefectsPreview = (ctx: CanvasRenderingContext2D, size: number, hasDefect: boolean) => {
    // We will do a green PCB board
    ctx.fillStyle = "#0f5a28";
    ctx.fillRect(0, 0, size, size);

    // Golden paths/lines
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(size * 0.2, 0); ctx.lineTo(size * 0.2, size);
    ctx.moveTo(size * 0.5, 0); ctx.lineTo(size * 0.5, size * 0.5); ctx.lineTo(size, size * 0.5);
    ctx.moveTo(0, size * 0.8); ctx.lineTo(size, size * 0.8);
    ctx.stroke();

    // Solder pads
    ctx.fillStyle = "#c0c0c0";
    ctx.beginPath();
    ctx.arc(size * 0.2, size * 0.3, 8, 0, 2*Math.PI);
    ctx.arc(size * 0.5, size * 0.5, 8, 0, 2*Math.PI);
    ctx.arc(size * 0.8, size * 0.8, 8, 0, 2*Math.PI);
    ctx.fill();

    if (hasDefect) {
      // Draw a scratch/crack defect
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(size * 0.35, size * 0.25);
      ctx.lineTo(size * 0.45, size * 0.4);
      ctx.lineTo(size * 0.4, size * 0.55);
      ctx.stroke();

      // Puncture hole
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.arc(size * 0.7, size * 0.3, 12, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const drawBarcodesPreview = (ctx: CanvasRenderingContext2D, size: number, isQr: boolean) => {
    // Cardboard brown background
    ctx.fillStyle = "#d7a15c";
    ctx.fillRect(0, 0, size, size);

    // White shipping sticker
    const pad = size * 0.15;
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);

    const stickerW = size - pad * 2;
    const stickerH = size - pad * 2;

    if (!isQr) {
      // Draw standard barcode lines
      let curX = pad + stickerW * 0.1;
      const endX = pad + stickerW * 0.9;
      const startY = pad + stickerH * 0.2;
      const endY = pad + stickerH * 0.7;

      ctx.fillStyle = "#111111";
      while (curX < endX) {
        const stripeW = 2 + Math.floor(Math.random() * 6);
        ctx.fillRect(curX, startY, Math.min(stripeW, endX - curX), endY - startY);
        curX += stripeW + 4 + Math.floor(Math.random() * 8);
      }

      // Numbers text below barcode
      ctx.fillStyle = "#111111";
      ctx.font = "14px monospace";
      ctx.fillText("42019382", pad + stickerW * 0.28, endY + stickerH * 0.15);
    } else {
      // Draw QR code with corner markers
      const qSize = stickerW * 0.7;
      const qx = pad + (stickerW - qSize) / 2;
      const qy = pad + (stickerH - qSize) / 2;

      // Outer border of QR
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(qx, qy, qSize, qSize);

      // Draw random pixel noise matrix
      ctx.fillStyle = "#111111";
      const cells = 14;
      const cellSize = qSize / cells;

      for (let x = 0; x < cells; x++) {
        for (let y = 0; y < cells; y++) {
          // Check if corner markers
          const isMarker = (
            (x < 4 && y < 4) ||
            (x >= cells - 4 && y < 4) ||
            (x < 4 && y >= cells - 4)
          );

          if (isMarker) {
            // Draw marker borders
            ctx.fillRect(qx + x * cellSize, qy + y * cellSize, cellSize, cellSize);
          } else if (Math.random() < 0.45) {
            ctx.fillRect(qx + x * cellSize, qy + y * cellSize, cellSize, cellSize);
          }
        }
      }

      // Draw white centers inside markers
      const markers = [
        { mx: 0, my: 0 },
        { mx: cells - 4, my: 0 },
        { mx: 0, my: cells - 4 }
      ];
      markers.forEach(m => {
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(qx + (m.mx + 1) * cellSize, qy + (m.my + 1) * cellSize, cellSize * 2, cellSize * 2);
        ctx.fillStyle = "#111111";
        ctx.fillRect(qx + (m.mx + 1.5) * cellSize, qy + (m.my + 1.5) * cellSize, cellSize * 1, cellSize * 1);
      });
    }
  };

  const drawCellsPreview = (ctx: CanvasRenderingContext2D, size: number, hasSickle: boolean) => {
    // Plasma light pink background
    ctx.fillStyle = "#f8ccd1";
    ctx.fillRect(0, 0, size, size);

    // Draw normal round red cells
    const cellColor = "#e14b4b";
    const outlineColor = "#b43232";

    const numCells = 15;
    for (let i = 0; i < numCells; i++) {
      const cx = 30 + Math.random() * (size - 60);
      const cy = 30 + Math.random() * (size - 60);
      const cr = 10 + Math.random() * 8;

      ctx.fillStyle = cellColor;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Dimple center (lighter)
      ctx.fillStyle = "#f0a0a0";
      ctx.beginPath();
      ctx.arc(cx, cy, cr * 0.4, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (hasSickle) {
      // Draw sickle crescent cells (distorted paths)
      ctx.fillStyle = "#c83c3c";
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2;

      for (let i = 0; i < 4; i++) {
        const tx = 40 + Math.random() * (size - 80);
        const ty = 40 + Math.random() * (size - 80);
        const sr = 18 + Math.random() * 6;

        ctx.beginPath();
        // Draw outer arc
        ctx.arc(tx, ty, sr, 0, Math.PI, false);
        // Draw inner arc to close the crescent
        ctx.arc(tx, ty + sr * 0.35, sr * 0.8, Math.PI, 0, true);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  const drawSignsPreview = (ctx: CanvasRenderingContext2D, size: number, sign: string) => {
    // Sky blue background
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    if (sign === "stop") {
      const r = size * 0.35;
      ctx.fillStyle = "#c80a0a";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;

      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45 + 22.5) * Math.PI / 180;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // STOP text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("STOP", cx, cy);
    } else if (sign === "yield") {
      const r = size * 0.38;
      // Outer red triangle
      ctx.fillStyle = "#c80a0a";
      ctx.beginPath();
      ctx.moveTo(cx, cy + r);
      ctx.lineTo(cx - r, cy - r * 0.5);
      ctx.lineTo(cx + r, cy - r * 0.5);
      ctx.closePath();
      ctx.fill();

      // Inner white triangle
      const ri = r * 0.65;
      ctx.fillStyle = "#fafafa";
      ctx.beginPath();
      ctx.moveTo(cx, cy + ri);
      ctx.lineTo(cx - ri, cy - ri * 0.5);
      ctx.lineTo(cx + ri, cy - ri * 0.5);
      ctx.closePath();
      ctx.fill();
    } else { // speed_limit
      const r = size * 0.35;
      ctx.fillStyle = "#fafafa";
      ctx.strokeStyle = "#c80a0a";
      ctx.lineWidth = 10;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // Value text
      ctx.fillStyle = "#111111";
      ctx.font = "bold 56px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("50", cx, cy);
    }
  };

  const drawSatellitePreview = (ctx: CanvasRenderingContext2D, size: number, land: string) => {
    // Draw 4x4 crop fields background
    const cells = 4;
    const cellSize = size / cells;
    const colors = ["#2e8b57", "#9acd32", "#d2b48c", "#228b22"];

    for (let x = 0; x < cells; x++) {
      for (let y = 0; y < cells; y++) {
        ctx.fillStyle = colors[(x * 3 + y * 7) % colors.length];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.strokeStyle = "rgba(100,80,50,0.2)";
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    if (land === "water") {
      // River/Lake
      ctx.fillStyle = "#1e90ff";
      ctx.beginPath();
      ctx.moveTo(0, size * 0.1);
      // Curved river paths
      ctx.bezierCurveTo(size * 0.3, size * 0.3, size * 0.4, size * 0.0, size * 0.7, size * 0.2);
      ctx.bezierCurveTo(size * 0.9, size * 0.3, size * 0.8, size * 0.9, size, size * 0.8);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.closePath();
      ctx.fill();
    } else if (land === "urban") {
      // Roads
      ctx.strokeStyle = "#808080";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(size * 0.3, 0); ctx.lineTo(size * 0.3, size);
      ctx.moveTo(0, size * 0.5); ctx.lineTo(size, size * 0.5);
      ctx.stroke();

      // Buildings
      ctx.fillStyle = "#dcdcdc";
      ctx.strokeStyle = "#505050";
      ctx.lineWidth = 1;
      const buildings = [
        { bx: 15, by: 20, w: 20, h: 20 },
        { bx: 150, by: 30, w: 25, h: 25 },
        { bx: 120, by: 160, w: 30, h: 20 },
        { bx: 210, by: 180, w: 20, h: 25 },
      ];
      buildings.forEach(b => {
        ctx.fillRect(b.bx, b.by, b.w, b.h);
        ctx.strokeRect(b.bx, b.by, b.w, b.h);
      });
    } else if (land === "forest") {
      // Forest tree canopy clusters (dark green circles)
      ctx.fillStyle = "#006450";
      for (let i = 0; i < 12; i++) {
        const tx = Math.random() * size;
        const ty = Math.random() * size;
        const tr = 15 + Math.random() * 15;
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  const drawCaptchaPreview = (ctx: CanvasRenderingContext2D, size: number, label: string) => {
    ctx.fillStyle = "#fcf9ea";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#cbc4af";
    for (let i = 0; i < 150; i++) {
      const rx = Math.random() * size;
      const ry = Math.random() * size;
      ctx.beginPath();
      ctx.arc(rx, ry, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.strokeStyle = "#9c8f6f";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.bezierCurveTo(
        Math.random() * size, Math.random() * size,
        Math.random() * size, Math.random() * size,
        Math.random() * size, Math.random() * size
      );
      ctx.stroke();
    }

    let length = 5;
    if (label === "4_characters") length = 4;
    else if (label === "6_characters") length = 6;

    const chars = "ABHKLMNPQRSTWXYZ345678";
    let text = "";
    for (let i = 0; i < length; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    ctx.fillStyle = "#1e293b";
    ctx.font = `bold ${Math.floor(180 / length)}px sans-serif`;
    ctx.textBaseline = "middle";

    const startX = size * 0.15;
    const spacing = (size * 0.7) / length;

    for (let i = 0; i < length; i++) {
      ctx.save();
      const cx = startX + i * spacing + spacing / 4;
      const cy = size / 2 + (Math.random() * 20 - 10);
      ctx.translate(cx, cy);
      const angle = (Math.random() * 40 - 20) * Math.PI / 180;
      ctx.rotate(angle);
      ctx.fillText(text.charAt(i), 0, 0);
      ctx.restore();
    }
  };

  const drawLicensePlatePreview = (ctx: CanvasRenderingContext2D, size: number, label: string) => {
    let bg = "#f3f4f6";
    let fg = "#111827";
    let border = "#1f2937";
    if (label === "yellow_plate") {
      bg = "#eab308";
      fg = "#0f172a";
      border = "#0f172a";
    } else if (label === "blue_plate") {
      bg = "#1d4ed8";
      fg = "#ffffff";
      border = "#ffffff";
    }

    ctx.fillStyle = "#374151";
    ctx.fillRect(0, 0, size, size);

    const px = size * 0.08;
    const py = size * 0.28;
    const pw = size - px * 2;
    const ph = size - py * 2;

    ctx.fillStyle = bg;
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = border;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(px + 8, py + 8, 3, 0, 2 * Math.PI);
    ctx.arc(px + pw - 8, py + 8, 3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = border;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    let headerText = "WISCONSIN";
    if (label === "yellow_plate") headerText = "GREAT BRITAIN";
    else if (label === "blue_plate") headerText = "EUROPE";
    ctx.fillText(headerText, size / 2, py + 12);

    ctx.fillStyle = fg;
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let serialText = "LPR-9428";
    if (label === "blue_plate") serialText = "EU KL 842";
    ctx.fillText(serialText, size / 2, py + ph / 2 + 5);
  };

  const drawDigitalDigitPreview = (ctx: CanvasRenderingContext2D, size: number, label: string) => {
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, size, size);

    const digit = parseInt(label) || 0;
    
    const segmentMap: Record<number, boolean[]> = {
      0: [true, true, true, false, true, true, true],
      1: [false, false, true, false, false, true, false],
      2: [true, false, true, true, true, false, true],
      3: [true, false, true, true, false, true, true],
      4: [false, true, true, true, false, true, false],
      5: [true, true, false, true, false, true, true],
      6: [true, true, false, true, true, true, true],
      7: [true, false, true, false, false, true, false],
      8: [true, true, true, true, true, true, true],
      9: [true, true, true, true, false, true, true]
    };

    const activeSegments = segmentMap[digit] || [true, true, true, true, true, true, true];

    const cx = size / 2;
    const cy = size / 2;
    const w = size * 0.42;
    const h = size * 0.72;
    
    const x1 = cx - w / 2;
    const y1 = cy - h / 2;
    const x2 = cx + w / 2;
    const y2 = cy + h / 2;

    const sw = size * 0.05;

    const colorActive = "#ef4444";
    const colorInactive = "#180505";

    const drawSegment = (active: boolean, sx1: number, sy1: number, sww: number, shh: number) => {
      ctx.fillStyle = active ? colorActive : colorInactive;
      ctx.fillRect(sx1, sy1, sww, shh);
      if (active) {
        ctx.shadowColor = colorActive;
        ctx.shadowBlur = 8;
        ctx.fillStyle = colorActive;
        ctx.fillRect(sx1, sy1, sww, shh);
        ctx.shadowBlur = 0;
      }
    };

    drawSegment(activeSegments[0], x1 + sw, y1, w - sw * 2, sw);
    drawSegment(activeSegments[1], x1, y1 + sw, sw, cy - y1 - sw - sw / 2);
    drawSegment(activeSegments[2], x2 - sw, y1 + sw, sw, cy - y1 - sw - sw / 2);
    drawSegment(activeSegments[3], x1 + sw, cy - sw / 2, w - sw * 2, sw);
    drawSegment(activeSegments[4], x1, cy + sw / 2, sw, y2 - cy - sw / 2 - sw);
    drawSegment(activeSegments[5], x2 - sw, cy + sw / 2, sw, y2 - cy - sw / 2 - sw);
    drawSegment(activeSegments[6], x1 + sw, y2 - sw, w - sw * 2, sw);
  };

  const drawArucoMarkerPreview = (ctx: CanvasRenderingContext2D, size: number, label: string) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const pad = size * 0.12;
    ctx.fillStyle = "#000000";
    ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);

    const gridBorder = size * 0.12;
    const gridX = pad + gridBorder;
    const gridY = pad + gridBorder;
    const gridWidth = size - gridX * 2;
    const cells = 5;
    const cellSize = gridWidth / cells;

    let markerId = 0;
    if (label === "marker_id_1") markerId = 1;
    else if (label === "marker_id_2") markerId = 2;

    ctx.fillStyle = "#ffffff";
    for (let x = 0; x < cells; x++) {
      for (let y = 0; y < cells; y++) {
        const stateVal = Math.sin((x * 3.5 + y * 7.1 + markerId * 13)) * 1000;
        const isWhite = (stateVal - Math.floor(stateVal)) > 0.55;
        if (isWhite) {
          ctx.fillRect(gridX + x * cellSize, gridY + y * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }
  };

  const drawEcgWaveformPreview = (ctx: CanvasRenderingContext2D, size: number, label: string) => {
    ctx.fillStyle = "#fef2f2";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "#fca5a5";
    ctx.lineWidth = 0.5;
    const spacing = size * 0.08;
    for (let i = 0; i < size; i += spacing) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }

    const cy = size / 2;
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();

    if (label === "v_fib") {
      ctx.moveTo(0, cy);
      for (let x = 0; x < size; x++) {
        const yNoise = Math.sin(x / 4) * (10 + Math.sin(x / 1.5) * 6) + (Math.random() * 6 - 3);
        ctx.lineTo(x, cy + yNoise);
      }
      ctx.stroke();
    } else {
      let x = 0;
      const isArrhythmia = (label === "arrhythmia");
      ctx.moveTo(0, cy);
      
      while (x < size) {
        const baselineW = isArrhythmia ? (20 + Math.random() * 30) : 35;
        ctx.lineTo(x + baselineW, cy);
        x += baselineW;

        if (x >= size) break;

        const pw = 12;
        for (let i = 0; i < pw; i++) {
          const px = x + i;
          const py = cy - Math.sin((i / pw) * Math.PI) * 6;
          ctx.lineTo(px, py);
        }
        x += pw;

        ctx.lineTo(x + 6, cy);
        x += 6;

        ctx.lineTo(x + 2, cy + 6);
        const rHeight = isArrhythmia ? (25 + Math.random() * 40) : 45;
        ctx.lineTo(x + 4, cy - rHeight);
        ctx.lineTo(x + 6, cy + 16);
        ctx.lineTo(x + 8, cy);
        x += 8;

        ctx.lineTo(x + 8, cy);
        x += 8;

        const tw = 16;
        for (let i = 0; i < tw; i++) {
          const px = x + i;
          const py = cy - Math.sin((i / tw) * Math.PI) * 12;
          ctx.lineTo(px, py);
        }
        x += tw;
      }
      ctx.stroke();
    }
  };

  const drawChessBoardPreview = (ctx: CanvasRenderingContext2D, size: number, label: string) => {
    const colors = ["#f0d9b5", "#b58863"];
    const cells = 8;
    const cellSize = size / cells;

    for (let x = 0; x < cells; x++) {
      for (let y = 0; y < cells; y++) {
        ctx.fillStyle = colors[(x + y) % 2];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    if (label === "active_game" || label === "checkmate") {
      const pieces = ["P", "R", "N", "B", "Q", "K", "P", "P", "R", "N", "B"];
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < pieces.length; i++) {
        const px = (i * 3 + 1) % 8;
        const py = (i * 2 + 3) % 8;
        const isBlack = (i % 2 === 0);
        ctx.fillStyle = isBlack ? "#1e293b" : "#ffffff";
        ctx.fillText(pieces[i], px * cellSize + cellSize / 2, py * cellSize + cellSize / 2);
      }

      if (label === "checkmate") {
        const kx = 4;
        const ky = 0;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.strokeRect(kx * cellSize + 2, ky * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.fillStyle = "#ef4444";
        ctx.fillText("K", kx * cellSize + cellSize / 2, ky * cellSize + cellSize / 2);
      }
    }
  };

  const applyNoiseOverlay = (ctx: CanvasRenderingContext2D, size: number, noise: string) => {
    if (noise === "none") return;

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // Salt and pepper pixel noise percentage
    const noisePct = noise === "low" ? 0.02 : 0.07;
    const numPixels = Math.floor(size * size * noisePct);

    for (let i = 0; i < numPixels; i++) {
      const rx = Math.floor(Math.random() * size);
      const ry = Math.floor(Math.random() * size);
      const index = (ry * size + rx) * 4;
      const colorVal = Math.random() < 0.5 ? 0 : 255; // black or white
      data[index] = colorVal;     // R
      data[index+1] = colorVal;   // G
      data[index+2] = colorVal;   // B
    }
    ctx.putImageData(imgData, 0, 0);

    // Scratch lines
    const numLines = noise === "low" ? 1 : 4;
    ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i < numLines; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.lineTo(Math.random() * size, Math.random() * size);
      ctx.stroke();
    }
  };

  // Trigger generator and download zip package
  const handleGenerateDataset = async () => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      // API returns a Blob package
      const blob = await api.generateImageDataset(
        selectedCategory,
        numImages,
        imageSize,
        noiseLevel,
        splitRatio
      );

      // Create download url link and click it
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `synthetic_images_${selectedCategory}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMsg(`Successfully generated ${totalGenerationCount} images! Check your browser's download folder.`);
      fetchQuotaInfo(); // Refresh usage statistics
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to generate image dataset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 lg:p-12 max-w-7xl xl:max-w-[90%] 2xl:max-w-[95%] mx-auto w-full space-y-8 pb-24 md:pb-12 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Image Studio</h1>
          <p className="text-muted text-sm mt-1.5 font-medium">
            Generate customized, labeled synthetic image directories packaged into ZIP training splits.
          </p>
        </div>

        {/* Quota overview badge */}
        <div className="glass-panel border border-card-border px-5 py-3 rounded-2xl flex items-center gap-4 bg-muted-bg/30">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted">Remaining Quota</div>
            <div className="text-sm font-extrabold text-foreground">
              {quotaRemaining !== null ? `${quotaRemaining.toLocaleString()} / ${maxRowsLimit.toLocaleString()} images` : "Loading..."}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Step 1: Category Selector (Left/Full Span on mobile) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border border-card-border p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">1</span>
              <h2 className="text-lg font-bold">Select Dataset Category</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedClass(cat.classes[0]);
                    }}
                    className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-md shadow-primary/5"
                        : "bg-transparent border-card-border hover:border-muted hover:bg-muted-bg/30"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl self-start mb-3 ${
                      isSelected ? "bg-primary text-white" : "bg-muted-bg text-muted"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-extrabold text-sm text-foreground mb-1">{cat.name}</span>
                    <span className="text-[11px] text-muted font-medium leading-relaxed">{cat.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Configuration & Parameters */}
          <div className="glass-panel border border-card-border p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">2</span>
              <h2 className="text-lg font-bold">Dataset Hyperparameters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sliders group */}
              <div className="space-y-5">
                {/* Image Count */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <label className="font-bold flex items-center gap-1.5">
                      Images Per Class
                      <span title="Number of files to generate for each output classification group." className="cursor-help flex items-center">
                        <HelpCircle className="h-3.5 w-3.5 text-muted" />
                      </span>
                    </label>
                    <span className="font-black text-primary bg-primary/15 px-2.5 py-0.5 rounded-md text-xs">
                      {numImages} / class
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={numImages}
                    onChange={(e) => setNumImages(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-muted-bg rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-muted">
                    <span>10</span>
                    <span>250</span>
                    <span>500</span>
                  </div>
                </div>

                {/* Split Ratio */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <label className="font-bold flex items-center gap-1.5">
                      Train / Validation Split
                      <span title="Percentage of images allocated for training. The remaining images go to the validation directory." className="cursor-help flex items-center">
                        <HelpCircle className="h-3.5 w-3.5 text-muted" />
                      </span>
                    </label>
                    <span className="font-black text-secondary bg-secondary/15 px-2.5 py-0.5 rounded-md text-xs">
                      {Math.round(splitRatio * 100)}% Train / {Math.round((1 - splitRatio) * 100)}% Val
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    value={splitRatio}
                    onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-muted-bg rounded-lg appearance-none cursor-pointer accent-secondary"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-muted">
                    <span>50%</span>
                    <span>70%</span>
                    <span>90%</span>
                  </div>
                </div>
              </div>

              {/* Grid selectors group */}
              <div className="space-y-5">
                {/* Image Resolution */}
                <div className="space-y-2.5">
                  <label className="text-sm font-bold flex items-center gap-1.5">
                    Target Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[64, 128, 224].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setImageSize(sz)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          imageSize === sz
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-transparent border-card-border hover:bg-muted-bg"
                        }`}
                      >
                        {sz} x {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Noise Level */}
                <div className="space-y-2.5">
                  <label className="text-sm font-bold flex items-center gap-1.5">
                    Noise Overlay Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["none", "low", "high"].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNoiseLevel(n)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer capitalize ${
                          noiseLevel === n
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-transparent border-card-border hover:bg-muted-bg"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Total Images Info Box */}
            <div className="p-4 bg-muted-bg/50 border border-card-border rounded-2xl flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted font-bold">Total Packaged Files</div>
                  <div className="text-base font-black text-foreground">
                    {totalGenerationCount.toLocaleString()} Images ({numClasses} classes)
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted font-semibold leading-relaxed max-w-xs">
                Generates <span className="text-foreground font-bold">{numImages}</span> images for each class, split into train/val subsets, with a root <code className="bg-card-border px-1.5 py-0.5 rounded font-black text-[10px]">metadata.csv</code> file.
              </div>
            </div>

          </div>
        </div>

        {/* Step 3: Preview Panel & Generation Trigger (Right) */}
        <div className="space-y-6">
          
          {/* Live Preview Frame */}
          <div className="glass-panel border border-card-border p-6 rounded-3xl flex flex-col items-center justify-between min-h-[380px] space-y-4">
            <div className="w-full flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Real-time Visualizer</span>
              </div>
              <button 
                onClick={handleRegeneratePreview}
                className="p-1.5 hover:bg-muted-bg text-muted hover:text-foreground rounded-lg transition-colors cursor-pointer"
                title="Randomize Preview Seed"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Canvas Outer Frame */}
            <div className="relative p-2 border-2 border-dashed border-card-border rounded-2xl bg-black/35 shadow-inner">
              <canvas 
                ref={canvasRef} 
                className="rounded-lg shadow-lg w-[196px] h-[196px] bg-neutral-900 border border-card-border/40"
              />
              <span className="absolute bottom-4 left-4 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider text-ellipsis overflow-hidden max-w-[150px]">
                {selectedClass}
              </span>
            </div>

            {/* Class Toggle Selector for Preview */}
            <div className="w-full space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-muted">Preview Class:</label>
              <div className="flex flex-wrap gap-1.5">
                {currentCategory.classes.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                      selectedClass === cls
                        ? "bg-secondary text-white border-secondary"
                        : "bg-muted-bg text-muted border-card-border hover:text-foreground"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action trigger Panel */}
          <div className="glass-panel border border-card-border p-6 rounded-3xl space-y-4">
            
            {/* Alerts & Messages */}
            {isQuotaExceeded && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl flex gap-3 text-red-500 items-start">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed font-semibold">
                  <span className="font-extrabold block mb-0.5">Quota Exceeded</span>
                  This generation uses {totalGenerationCount} images, which exceeds your remaining limit of {quotaRemaining} images.
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/25 rounded-2xl flex gap-3 text-green-500 items-start animate-fade-in-up">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed font-semibold">
                  <span className="font-extrabold block mb-0.5">Generation Complete</span>
                  {successMsg}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl flex gap-3 text-red-500 items-start animate-fade-in-up">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed font-semibold">
                  {errorMsg}
                </div>
              </div>
            )}

            {/* Submit download button */}
            <button
              onClick={handleGenerateDataset}
              disabled={loading || isQuotaExceeded}
              className={`w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-white font-extrabold text-sm transition-all shadow-lg cursor-pointer ${
                isQuotaExceeded
                  ? "bg-card-border text-muted cursor-not-allowed shadow-none"
                  : loading
                    ? "bg-primary/50 text-white cursor-wait"
                    : "bg-linear-to-r from-primary to-secondary hover:brightness-110 shadow-primary/20"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating & Packaging Zip...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Image Dataset ZIP
                </>
              )}
            </button>

            {/* Small info footer */}
            <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted font-bold">
              <Info className="h-3.5 w-3.5" />
              <span>Uses Pillow drawing pipelines in the backend.</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
