import random
import uuid
import math
import io
import os
import csv
import zipfile
from typing import Dict, Any, List, Tuple
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Font loading helper
def get_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except IOError:
        try:
            return ImageFont.truetype("calibri.ttf", size)
        except IOError:
            return ImageFont.load_default()

class SyntheticImageGenerator:
    def __init__(self):
        pass

    def add_noise(self, img: Image.Image, noise_level: str) -> Image.Image:
        if noise_level == "none":
            return img
        
        # Convert to RGB if not already
        img = img.convert("RGB")
        width, height = img.size
        pixels = img.load()
        
        # Determine noise parameters
        if noise_level == "low":
            noise_pct = 0.02
            num_lines = 1
        else: # "high"
            noise_pct = 0.08
            num_lines = 4

        draw = ImageDraw.Draw(img)

        # 1. Add random pixel noise (salt & pepper)
        num_pixels = int(width * height * noise_pct)
        for _ in range(num_pixels):
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            color = random.choice([(0, 0, 0), (255, 255, 255)]) # Black or white
            pixels[x, y] = color

        # 2. Add random line/scratch artifacts
        for _ in range(num_lines):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            line_color = random.choice([(50, 50, 50), (200, 200, 200)])
            draw.line([x1, y1, x2, y2], fill=line_color, width=1)

        return img

    def generate_shape(self, shape_type: str, size: int) -> Image.Image:
        # Random background color (dark tones)
        bg = (random.randint(10, 30), random.randint(10, 30), random.randint(15, 35))
        img = Image.new("RGB", (size, size), bg)
        draw = ImageDraw.Draw(img)

        # Random shape parameters
        shape_color = (random.randint(100, 255), random.randint(100, 255), random.randint(100, 255))
        padding = int(size * 0.15)
        min_dim = int(size * 0.3)
        max_dim = int(size * 0.7)

        # Random positions
        x1 = random.randint(padding, size - max_dim)
        y1 = random.randint(padding, size - max_dim)
        w = random.randint(min_dim, max_dim)
        h = random.randint(min_dim, max_dim)
        x2, y2 = x1 + w, y1 + h

        if shape_type == "circle":
            draw.ellipse([x1, y1, x2, y2], fill=shape_color)
        elif shape_type == "square":
            draw.rectangle([x1, y1, x2, y2], fill=shape_color)
        else: # "triangle"
            points = [
                (x1 + w // 2, y1),
                (x1, y2),
                (x2, y2)
            ]
            draw.polygon(points, fill=shape_color)

        return img

    def generate_ocr_digit(self, digit: int, size: int) -> Image.Image:
        # Grayscale background
        bg = random.randint(15, 45)
        img = Image.new("RGB", (size, size), (bg, bg, bg))
        
        # Create a separate image to draw text, rotate it, and paste it back
        text_img = Image.new("L", (size, size), 0)
        text_draw = ImageDraw.Draw(text_img)
        
        # Load font and calculate position
        font_size = int(size * 0.6)
        font = get_font(font_size)
        
        digit_str = str(digit)
        # Draw text at center
        text_draw.text((size // 4, size // 6), digit_str, fill=255, font=font)
        
        # Rotate text image slightly (-25 to 25 deg)
        angle = random.randint(-25, 25)
        rotated_text = text_img.rotate(angle, resample=Image.Resampling.BILINEAR)
        
        # Apply the rotated text as a mask with a random color
        fg_color = (random.randint(180, 255), random.randint(180, 255), random.randint(180, 255))
        draw = ImageDraw.Draw(img)
        draw.bitmap((0, 0), rotated_text, fill=fg_color)
        
        return img

    def generate_color_pattern(self, pattern_type: str, size: int) -> Image.Image:
        img = Image.new("RGB", (size, size))
        draw = ImageDraw.Draw(img)

        if pattern_type == "solid":
            color = (random.randint(40, 240), random.randint(40, 240), random.randint(40, 240))
            draw.rectangle([0, 0, size, size], fill=color)
        elif pattern_type == "gradient":
            color1 = (random.randint(30, 120), random.randint(30, 120), random.randint(30, 120))
            color2 = (random.randint(130, 245), random.randint(130, 245), random.randint(130, 245))
            
            # Linear horizontal/vertical gradient
            direction = random.choice(["h", "v"])
            for i in range(size):
                t = i / size
                r = int(color1[0] * (1 - t) + color2[0] * t)
                g = int(color1[1] * (1 - t) + color2[1] * t)
                b = int(color1[2] * (1 - t) + color2[2] * t)
                if direction == "h":
                    draw.line([i, 0, i, size], fill=(r, g, b))
                else:
                    draw.line([0, i, size, i], fill=(r, g, b))
        else: # "checkerboard"
            color1 = (random.randint(20, 80), random.randint(20, 80), random.randint(20, 80))
            color2 = (random.randint(140, 220), random.randint(140, 220), random.randint(140, 220))
            num_blocks = random.choice([4, 8, 10])
            block_size = size / num_blocks
            for x in range(num_blocks):
                for y in range(num_blocks):
                    fill_color = color1 if (x + y) % 2 == 0 else color2
                    bx1 = int(x * block_size)
                    by1 = int(y * block_size)
                    bx2 = int((x + 1) * block_size)
                    by2 = int((y + 1) * block_size)
                    draw.rectangle([bx1, by1, bx2, by2], fill=fill_color)

        return img

    def generate_brain_mri(self, is_tumor: bool, size: int) -> Image.Image:
        # Dark base
        img = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(img)

        # Center coordinates
        skull_x = size // 2
        skull_y = size // 2
        skull_rx = int(size * 0.38)
        skull_ry = int(size * 0.44)

        # Draw skull ring
        draw.ellipse([skull_x - skull_rx, skull_y - skull_ry, skull_x + skull_rx, skull_y + skull_ry], outline=170, width=max(2, int(size * 0.025)))

        # Brain tissue (cerebral hemispheres)
        brain_rx = int(skull_rx * 0.88)
        brain_ry = int(skull_ry * 0.88)
        # Symmetrical lobes
        draw.ellipse([skull_x, skull_y - brain_ry, skull_x + brain_rx, skull_y + brain_ry], fill=55)
        draw.ellipse([skull_x - brain_rx, skull_y - brain_ry, skull_x, skull_y + brain_ry], fill=55)

        # Ventricles (dark central butterfly)
        v_w = int(size * 0.07)
        v_h = int(size * 0.14)
        draw.ellipse([skull_x - v_w - 1, skull_y - v_h // 2, skull_x - 1, skull_y + v_h // 2], fill=18)
        draw.ellipse([skull_x + 1, skull_y - v_h // 2, skull_x + v_w + 1, skull_y + v_h // 2], fill=18)

        # Symmetrical brain fold lines (gyri)
        for _ in range(12):
            lx = random.randint(skull_x - brain_rx + 8, skull_x + brain_rx - 8)
            ly = random.randint(skull_y - brain_ry + 8, skull_y + brain_ry - 8)
            dist_x = lx - skull_x
            r = random.randint(4, 16)
            draw.arc([skull_x + dist_x - r, ly - r, skull_x + dist_x + r, ly + r], 0, 360, fill=100, width=1)
            draw.arc([skull_x - dist_x - r, ly - r, skull_x - dist_x + r, ly + r], 0, 360, fill=100, width=1)

        # Optional tumor injection
        if is_tumor:
            # Pick a quadrant
            tx = skull_x + random.choice([-1, 1]) * random.randint(int(brain_rx * 0.25), int(brain_rx * 0.65))
            ty = skull_y + random.choice([-1, 1]) * random.randint(int(brain_ry * 0.25), int(brain_ry * 0.65))
            tr = random.randint(int(size * 0.05), int(size * 0.09))

            # Edema halo (swelling)
            draw.ellipse([tx - int(tr * 1.4), ty - int(tr * 1.4), tx + int(tr * 1.4), ty + int(tr * 1.4), ], fill=35)

            # Irregular Tumor shape
            num_pts = 7
            pts = []
            for k in range(num_pts):
                ang = k * (2 * math.pi / num_pts)
                radius = tr * random.uniform(0.75, 1.25)
                px = tx + int(radius * math.cos(ang))
                py = ty + int(radius * math.sin(ang))
                pts.append((px, py))
            draw.polygon(pts, fill=230)

            # Darker necrotic center
            if random.random() < 0.6:
                draw.ellipse([tx - tr // 3, ty - tr // 3, tx + tr // 3, ty + tr // 3], fill=110)

        # Overlay scan lines
        for y in range(0, size, 4):
            draw.line([0, y, size, y], fill=12, width=1)

        # Patient Info overlays
        try:
            font = ImageFont.load_default()
            draw.text((6, 6), "PAT: SDS-MOCK", fill=140, font=font)
            draw.text((6, 16), "SEQ: T2-FLAIR", fill=140, font=font)
            draw.text((6, size - 15), f"SL: {random.randint(15, 75)}/90", fill=140, font=font)
        except:
            pass

        # Smooth out organic tissues
        img = img.filter(ImageFilter.GaussianBlur(radius=0.75))
        return img.convert("RGB")

    def generate_defect(self, is_defect: bool, size: int) -> Image.Image:
        # Background: metal or green PCB
        bg_type = random.choice(["metal", "pcb"])
        img = Image.new("RGB", (size, size))
        draw = ImageDraw.Draw(img)

        if bg_type == "metal":
            # Silver/Gray background
            gray = random.randint(110, 140)
            draw.rectangle([0, 0, size, size], fill=(gray, gray, gray))
            # Brushed metal texture lines
            for _ in range(40):
                y = random.randint(0, size)
                g_val = gray + random.randint(-15, 15)
                draw.line([0, y, size, y], fill=(g_val, g_val, g_val), width=1)
        else: # "pcb"
            # Green background
            green = random.randint(70, 110)
            draw.rectangle([0, 0, size, size], fill=(15, green, 30))
            # Draw traces/solder joints
            color_gold = (184, 134, 11)
            color_silver = (192, 192, 192)
            for _ in range(8):
                coord = random.randint(20, size - 20)
                # Draw lines representing gold paths
                draw.line([coord, 0, coord, size], fill=color_gold, width=2)
                draw.line([0, coord, size, coord], fill=color_gold, width=2)
                # Solder pads
                draw.ellipse([coord - 4, coord - 4, coord + 4, coord + 4], fill=color_silver)

        # Inject defects
        if is_defect:
            defect_type = random.choice(["crack", "scratch", "hole"])
            dx = random.randint(int(size * 0.2), int(size * 0.7))
            dy = random.randint(int(size * 0.2), int(size * 0.7))
            d_len = random.randint(20, 60)

            if defect_type == "crack":
                # Jagged black line
                cx1, cy1 = dx, dy
                for _ in range(4):
                    cx2 = cx1 + random.randint(-10, 15)
                    cy2 = cy1 + random.randint(5, 15)
                    draw.line([cx1, cy1, cx2, cy2], fill=(10, 10, 10), width=max(1, int(size * 0.01)))
                    cx1, cy1 = cx2, cy2
            elif defect_type == "scratch":
                # Straight bright white/silver line
                draw.line([dx, dy, dx + d_len, dy + d_len // 2], fill=(240, 240, 240), width=max(1, int(size * 0.007)))
            else: # "hole"
                # Dark gray/black circle representing a physical puncture
                hr = random.randint(5, 15)
                draw.ellipse([dx - hr, dy - hr, dx + hr, dy + hr], fill=(5, 5, 5))

        return img

    def generate_barcode_qr(self, is_qr: bool, size: int) -> Image.Image:
        # Cardboard box background (brownish)
        bg = (random.randint(180, 210), random.randint(140, 170), random.randint(90, 120))
        img = Image.new("RGB", (size, size), bg)
        draw = ImageDraw.Draw(img)

        # White sticker label
        padding = int(size * 0.15)
        lx1, ly1 = padding, padding
        lx2, ly2 = size - padding, size - padding
        draw.rectangle([lx1, ly1, lx2, ly2], fill=(250, 250, 250))

        # Sticker inner boundaries
        sw = lx2 - lx1
        sh = ly2 - ly1

        if not is_qr:
            # Barcode - vertical stripes
            bx1 = lx1 + int(sw * 0.1)
            bx2 = lx2 - int(sw * 0.1)
            by1 = ly1 + int(sh * 0.2)
            by2 = ly2 - int(sh * 0.3)
            
            cur_x = bx1
            while cur_x < bx2:
                # Random stripe width (1 to 5 pixels)
                stripe_w = random.randint(1, 4)
                # Draw black stripe
                draw.rectangle([cur_x, by1, min(cur_x + stripe_w, bx2), by2], fill=(10, 10, 10))
                # Random spacing (2 to 7 pixels)
                cur_x += stripe_w + random.randint(2, 7)
                
            # Add fake barcode digits below
            try:
                font = get_font(int(size * 0.08))
                code_str = "".join([str(random.randint(0, 9)) for _ in range(8)])
                draw.text((bx1 + int(sw * 0.15), by2 + 2), code_str, fill=(10, 10, 10), font=font)
            except:
                pass
        else:
            # QR code - pixelated blocks with 3 corner markers
            q_size = int(sw * 0.7)
            qx1 = lx1 + (sw - q_size) // 2
            qy1 = ly1 + (sh - q_size) // 2
            
            # Draw fake pixelated matrix
            grid_cells = 12
            cell_size = q_size / grid_cells
            for x in range(grid_cells):
                for y in range(grid_cells):
                    # Always draw corner markers (outer border and inner block)
                    is_marker = (
                        (x < 3 and y < 3) or 
                        (x >= grid_cells - 3 and y < 3) or 
                        (x < 3 and y >= grid_cells - 3)
                    )
                    
                    cx1 = int(qx1 + x * cell_size)
                    cy1 = int(qy1 + y * cell_size)
                    cx2 = int(qx1 + (x + 1) * cell_size)
                    cy2 = int(qy1 + (y + 1) * cell_size)
                    
                    if is_marker:
                        # Draw marker boundary
                        draw.rectangle([cx1, cy1, cx2, cy2], fill=(10, 10, 10))
                    elif random.random() < 0.45:
                        draw.rectangle([cx1, cy1, cx2, cy2], fill=(10, 10, 10))
                        
            # Draw center white boxes for the 3 corner markers
            markers_offsets = [(0, 0), (grid_cells - 3, 0), (0, grid_cells - 3)]
            for mx, my in markers_offsets:
                # White inner ring
                cx1 = int(qx1 + (mx + 1) * cell_size)
                cy1 = int(qy1 + (my + 1) * cell_size)
                cx2 = int(qx1 + (mx + 2) * cell_size)
                cy2 = int(qy1 + (my + 2) * cell_size)
                draw.rectangle([cx1, cy1, cx2 - 1, cy2 - 1], fill=(250, 250, 250))

        return img

    def generate_cells(self, is_sickle: bool, size: int) -> Image.Image:
        # Blood plasma background (light pink/reddish)
        bg = (248, 205, 205)
        img = Image.new("RGB", (size, size), bg)
        draw = ImageDraw.Draw(img)

        # Scattered red blood cells (reddish-pink with darker outline)
        cell_color = (225, 75, 75)
        outline_color = (180, 50, 50)
        
        num_cells = random.randint(15, 25)
        for _ in range(num_cells):
            cx = random.randint(15, size - 15)
            cy = random.randint(15, size - 15)
            cr = random.randint(int(size * 0.04), int(size * 0.08))
            
            # Spheroid / round cells
            draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=cell_color, outline=outline_color, width=1)
            # Central pallor (dimple in red blood cells - lighter center)
            draw.ellipse([cx - cr // 2, cy - cy // 2, cx + cr // 2, cy + cr // 2], fill=(240, 160, 160))

        if is_sickle:
            # Inject 4-8 crescent/sickle cells (distorted polygon shapes)
            num_sickles = random.randint(4, 8)
            for _ in range(num_sickles):
                tx = random.randint(20, size - 20)
                ty = random.randint(20, size - 20)
                sr = random.randint(int(size * 0.06), int(size * 0.12))
                
                # Crescent path using a polygon
                points = []
                num_pts = 10
                for k in range(num_pts):
                    angle = k * (math.pi / (num_pts - 1))
                    # Outer curve
                    px = tx + int(sr * math.cos(angle))
                    py = ty + int((sr // 2) * math.sin(angle))
                    points.append((px, py))
                for k in range(num_pts - 1, -1, -1):
                    angle = k * (math.pi / (num_pts - 1))
                    # Inner curve (skewed center)
                    px = tx + int((sr * 0.85) * math.cos(angle))
                    py = ty + int((sr // 5) * math.sin(angle))
                    points.append((px, py))
                    
                draw.polygon(points, fill=(200, 60, 60), outline=outline_color)

        return img

    def generate_traffic_sign(self, sign_type: str, size: int) -> Image.Image:
        # Background: sky or landscape (simple sky gradient/blue)
        bg = (135, 206, 235) # sky blue
        img = Image.new("RGB", (size, size), bg)
        draw = ImageDraw.Draw(img)

        # Center coordinates
        cx = size // 2
        cy = size // 2

        if sign_type == "stop":
            # Red octagon
            r = int(size * 0.35)
            points = []
            for i in range(8):
                angle = (i * 45 + 22.5) * (math.pi / 180)
                px = cx + int(r * math.cos(angle))
                py = cy + int(r * math.sin(angle))
                points.append((px, py))
            draw.polygon(points, fill=(200, 10, 10), outline=(255, 255, 255), width=3)
            # Text: "STOP"
            try:
                font = get_font(int(size * 0.16))
                draw.text((cx - int(size * 0.2), cy - int(size * 0.09)), "STOP", fill=(255, 255, 255), font=font)
            except:
                pass
        elif sign_type == "yield":
            # Downward pointing red/white triangle
            r = int(size * 0.38)
            # Outer red triangle
            pts_outer = [
                (cx, cy + r), # bottom
                (cx - r, cy - r // 2), # top left
                (cx + r, cy - r // 2) # top right
            ]
            draw.polygon(pts_outer, fill=(200, 10, 10))
            # Inner white triangle
            ri = int(r * 0.65)
            pts_inner = [
                (cx, cy + ri),
                (cx - ri, cy - ri // 2),
                (cx + ri, cy - ri // 2)
            ]
            draw.polygon(pts_inner, fill=(250, 250, 250))
        else: # "speed_limit"
            # White circle with red border
            r = int(size * 0.35)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(250, 250, 250), outline=(200, 10, 10), width=max(4, int(size * 0.05)))
            # Speed value (e.g. 50, 80)
            speed = random.choice(["50", "60", "80", "100"])
            try:
                font = get_font(int(size * 0.24))
                draw.text((cx - int(size * 0.13), cy - int(size * 0.13)), speed, fill=(10, 10, 10), font=font)
            except:
                pass

        return img

    def generate_satellite(self, land_type: str, size: int) -> Image.Image:
        # Grids of different color segments
        img = Image.new("RGB", (size, size))
        draw = ImageDraw.Draw(img)

        # Base green grass/field background
        draw.rectangle([0, 0, size, size], fill=(34, 139, 34))

        # Add grid lines representing farm crop fields
        field_color_1 = (46, 139, 87) # sea green
        field_color_2 = (154, 205, 50) # yellow green
        field_color_3 = (210, 180, 140) # sandy brown (plowed field)

        grid_cells = 5
        cell_size = size / grid_cells
        for x in range(grid_cells):
            for y in range(grid_cells):
                # Pick a texture color
                f_color = random.choice([field_color_1, field_color_2, field_color_3])
                bx1 = int(x * cell_size)
                by1 = int(y * cell_size)
                bx2 = int((x + 1) * cell_size)
                by2 = int((y + 1) * cell_size)
                draw.rectangle([bx1, by1, bx2, by2], fill=f_color, outline=(100, 80, 50), width=1)

        if land_type == "water":
            # Draw a diagonal blue river or central blue lake
            pts = []
            river_w = int(size * 0.12)
            for y in range(0, size, 10):
                deviation = int(math.sin(y / 20.0) * 15.0)
                center_x = size // 2 + deviation
                pts.append((center_x - river_w, y))
            for y in range(size, -1, -10):
                deviation = int(math.sin(y / 20.0) * 15.0)
                center_x = size // 2 + deviation
                pts.append((center_x + river_w, y))
            draw.polygon(pts, fill=(30, 144, 255)) # dodger blue
        elif land_type == "urban":
            # Draw gray urban roads and tiny gray/white buildings
            road_w = max(2, int(size * 0.05))
            # Cross roads
            draw.line([size // 3, 0, size // 3, size], fill=(128, 128, 128), width=road_w)
            draw.line([0, size // 2, size, size // 2], fill=(128, 128, 128), width=road_w)
            
            # Tiny building structures
            build_color = (220, 220, 220)
            for _ in range(8):
                bx = random.randint(10, size - 30)
                by = random.randint(10, size - 30)
                bw = random.randint(8, 20)
                bh = random.randint(8, 20)
                # Ensure they don't block the center of roads
                if abs(bx - size // 3) > 15 and abs(by - size // 2) > 15:
                    draw.rectangle([bx, by, bx + bw, by + bh], fill=build_color, outline=(80, 80, 80))
        else: # "forest"
            # Overlay dense, dark green circular blobs representing forest canopy tree clusters
            forest_color = (0, 100, 80)
            for _ in range(15):
                tx = random.randint(10, size - 30)
                ty = random.randint(10, size - 30)
                tr = random.randint(12, 32)
                draw.ellipse([tx - tr, ty - tr, tx + tr, ty + tr], fill=forest_color)

        # Apply a subtle blur to represent distant satellite view
        img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
        return img

    def generate_captcha(self, label: str, size: int) -> Tuple[Image.Image, str]:
        bg = (random.randint(235, 255), random.randint(230, 250), random.randint(220, 245))
        img = Image.new("RGB", (size, size), bg)
        draw = ImageDraw.Draw(img)
        
        length = 5
        if label == "4_characters":
            length = 4
        elif label == "6_characters":
            length = 6
            
        chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789"
        captcha_str = "".join(random.choice(chars) for _ in range(length))
        
        for _ in range(int(size * 1.5)):
            x = random.randint(0, size - 1)
            y = random.randint(0, size - 1)
            dot_color = (random.randint(150, 220), random.randint(150, 220), random.randint(150, 220))
            draw.ellipse([x, y, x + 2, y + 2], fill=dot_color)

        for _ in range(random.randint(3, 5)):
            x1 = random.randint(0, size)
            y1 = random.randint(0, size)
            x2 = random.randint(0, size)
            y2 = random.randint(0, size)
            line_color = (random.randint(100, 180), random.randint(100, 180), random.randint(100, 180))
            draw.line([x1, y1, x2, y2], fill=line_color, width=random.randint(1, 2))

        font_size = int(size * 0.7) // length
        font = get_font(font_size)
        
        start_x = int(size * 0.15)
        spacing = int(size * 0.7) // length
        
        for i, char in enumerate(captcha_str):
            char_img = Image.new("L", (font_size * 2, font_size * 2), 0)
            char_draw = ImageDraw.Draw(char_img)
            char_draw.text((font_size // 2, font_size // 2), char, fill=255, font=font)
            
            angle = random.randint(-30, 30)
            rotated_char = char_img.rotate(angle, resample=Image.Resampling.BILINEAR)
            
            fg_color = (random.randint(10, 100), random.randint(10, 100), random.randint(10, 120))
            
            char_w, char_h = rotated_char.size
            cx = start_x + i * spacing - char_w // 4
            cy = size // 2 - char_h // 2 + random.randint(-int(size * 0.08), int(size * 0.08))
            
            img.paste(Image.new("RGB", (char_w, char_h), fg_color), (int(cx), int(cy)), mask=rotated_char)

        return img, captcha_str

    def generate_license_plate(self, label: str, size: int) -> Image.Image:
        if label == "yellow_plate":
            bg = (255, 205, 30)
            fg = (10, 10, 10)
        elif label == "blue_plate":
            bg = (20, 60, 170)
            fg = (250, 250, 250)
        else:
            bg = (245, 245, 245)
            fg = (15, 15, 30)
            
        img = Image.new("RGB", (size, size), (50, 50, 50))
        draw = ImageDraw.Draw(img)
        
        pad_x = int(size * 0.08)
        pad_y = int(size * 0.25)
        pw = size - pad_x * 2
        ph = size - pad_y * 2
        
        draw.rectangle([pad_x, pad_y, size - pad_x, size - pad_y], fill=bg)
        draw.rectangle([pad_x + 2, pad_y + 2, size - pad_x - 2, size - pad_y - 2], outline=fg, width=2)
        
        hole_r = max(1, int(size * 0.015))
        draw.ellipse([pad_x + 6, pad_y + 6, pad_x + 6 + hole_r*2, pad_y + 6 + hole_r*2], fill=(10, 10, 10))
        draw.ellipse([size - pad_x - 6 - hole_r*2, pad_y + 6, size - pad_x - 6, pad_y + 6 + hole_r*2], fill=(10, 10, 10))
        
        try:
            h_font = get_font(max(5, int(size * 0.06)))
            states = ["CALIFORNIA", "WISCONSIN", "OHIO", "FLORIDA", "TEXAS"]
            header = random.choice(states)
            if label == "yellow_plate":
                header = "GREAT BRITAIN"
            elif label == "blue_plate":
                header = "EUROPE"
            
            draw.text((size // 2 - len(header)*int(size*0.018), pad_y + int(ph * 0.08)), header, fill=fg, font=h_font)
        except:
            pass

        letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        numbers = "0123456789"
        serial = f"{random.choice(letters)}{random.choice(letters)}{random.choice(letters)}-{random.choice(numbers)}{random.choice(numbers)}{random.choice(numbers)}{random.choice(numbers)}"
        if label == "blue_plate":
            serial = f"EU {random.choice(letters)}{random.choice(letters)} {random.choice(numbers)}{random.choice(numbers)}{random.choice(numbers)}"
            
        try:
            s_font = get_font(int(size * 0.16))
            draw.text((pad_x + int(pw * 0.1), pad_y + int(ph * 0.3)), serial, fill=fg, font=s_font)
        except:
            pass
            
        return img

    def generate_digital_digit(self, label: str, size: int) -> Image.Image:
        img = Image.new("RGB", (size, size), (5, 5, 10))
        draw = ImageDraw.Draw(img)
        
        digit = 0
        try:
            digit = int(label)
        except:
            digit = 0
            
        segment_map = {
            0: [True, True, True, False, True, True, True],
            1: [False, False, True, False, False, True, False],
            2: [True, False, True, True, True, False, True],
            3: [True, False, True, True, False, True, True],
            4: [False, True, True, True, False, True, False],
            5: [True, True, False, True, False, True, True],
            6: [True, True, False, True, True, True, True],
            7: [True, False, True, False, False, True, False],
            8: [True, True, True, True, True, True, True],
            9: [True, True, True, True, False, True, True]
        }
        
        segments = segment_map.get(digit, [True]*7)
        
        cx = size // 2
        cy = size // 2
        w = int(size * 0.4)
        h = int(size * 0.7)
        x1 = cx - w // 2
        y1 = cy - h // 2
        x2 = cx + w // 2
        y2 = cy + h // 2
        
        color_active = random.choice([(255, 20, 20), (20, 255, 20)])
        color_inactive = (int(color_active[0] * 0.08), int(color_active[1] * 0.08), int(color_active[2] * 0.08))
        
        sw = max(2, int(size * 0.045))
        
        draw.rectangle([x1 + sw, y1, x2 - sw, y1 + sw], fill=color_active if segments[0] else color_inactive)
        draw.rectangle([x1, y1 + sw, x1 + sw, cy - sw // 2], fill=color_active if segments[1] else color_inactive)
        draw.rectangle([x2 - sw, y1 + sw, x2, cy - sw // 2], fill=color_active if segments[2] else color_inactive)
        draw.rectangle([x1 + sw, cy - sw // 2, x2 - sw, cy + sw // 2], fill=color_active if segments[3] else color_inactive)
        draw.rectangle([x1, cy + sw // 2, x1 + sw, y2 - sw], fill=color_active if segments[4] else color_inactive)
        draw.rectangle([x2 - sw, cy + sw // 2, x2, y2 - sw], fill=color_active if segments[5] else color_inactive)
        draw.rectangle([x1 + sw, y2 - sw, x2 - sw, y2], fill=color_active if segments[6] else color_inactive)
        
        return img

    def generate_aruco_marker(self, label: str, size: int) -> Image.Image:
        img = Image.new("RGB", (size, size), (250, 250, 250))
        draw = ImageDraw.Draw(img)
        
        pad = int(size * 0.12)
        draw.rectangle([pad, pad, size - pad, size - pad], fill=(10, 10, 10))
        
        grid_border = int(size * 0.12)
        grid_size = size - (pad + grid_border) * 2
        cells = 5
        cell_size = grid_size / cells
        
        marker_id = 0
        if label == "marker_id_1":
            marker_id = 1
        elif label == "marker_id_2":
            marker_id = 2
            
        random.seed(marker_id + 42)
        
        start_xy = pad + grid_border
        for x in range(cells):
            for y in range(cells):
                is_black = random.choice([True, False])
                if is_black:
                    cx1 = int(start_xy + x * cell_size)
                    cy1 = int(start_xy + y * cell_size)
                    cx2 = int(start_xy + (x + 1) * cell_size)
                    cy2 = int(start_xy + (y + 1) * cell_size)
                    draw.rectangle([cx1, cy1, cx2, cy2], fill=(250, 250, 250))
                    
        random.seed()
        return img

    def generate_ecg_waveform(self, label: str, size: int) -> Image.Image:
        bg = (255, 235, 235)
        img = Image.new("RGB", (size, size), bg)
        draw = ImageDraw.Draw(img)
        
        grid_color = (255, 195, 195)
        grid_spacing = int(size * 0.08)
        for i in range(0, size, grid_spacing):
            draw.line([i, 0, i, size], fill=grid_color, width=1)
            draw.line([0, i, size, i], fill=grid_color, width=1)
            
        pts = []
        cy = size // 2
        
        if label == "v_fib":
            for x in range(size):
                noise = math.sin(x / 4.0) * random.uniform(5, 18) + random.uniform(-4, 4)
                pts.append((x, cy + int(noise)))
        else:
            x = 0
            is_arrhythmia = (label == "arrhythmia")
            
            while x < size:
                baseline_w = random.randint(25, 45) if is_arrhythmia else 35
                for _ in range(baseline_w):
                    if x >= size: break
                    pts.append((x, cy + random.randint(-1, 1)))
                    x += 1
                
                if x >= size: break
                
                p_w = 12
                for i in range(p_w):
                    if x >= size: break
                    bump = math.sin((i / p_w) * math.pi) * 6
                    pts.append((x, cy - int(bump)))
                    x += 1
                    
                for _ in range(6):
                    if x >= size: break
                    pts.append((x, cy))
                    x += 1
                    
                if x < size:
                    pts.append((x, cy + 8))
                    x += 1
                r_h = random.randint(30, 65) if is_arrhythmia else 45
                if x < size:
                    pts.append((x, cy - r_h))
                    x += 1
                if x < size:
                    pts.append((x, cy + 18))
                    x += 1
                if x < size:
                    pts.append((x, cy))
                    x += 1
                    
                for _ in range(8):
                    if x >= size: break
                    pts.append((x, cy))
                    x += 1
                    
                t_w = 16
                for i in range(t_w):
                    if x >= size: break
                    bump = math.sin((i / t_w) * math.pi) * 12
                    pts.append((x, cy - int(bump)))
                    x += 1
                    
        if len(pts) > 1:
            draw.line(pts, fill=(10, 10, 10), width=2, joint="round")
            
        return img

    def generate_chess_board(self, label: str, size: int) -> Image.Image:
        img = Image.new("RGB", (size, size))
        draw = ImageDraw.Draw(img)
        
        colors = [(240, 217, 181), (181, 136, 99)]
        cells = 8
        cell_size = size / cells
        
        for x in range(cells):
            for y in range(cells):
                fill_color = colors[(x + y) % 2]
                cx1 = int(x * cell_size)
                cy1 = int(y * cell_size)
                cx2 = int((x + 1) * cell_size)
                cy2 = int((y + 1) * cell_size)
                draw.rectangle([cx1, cy1, cx2, cy2], fill=fill_color)
                
        if label in ["active_game", "checkmate"]:
            pieces = ["P", "N", "B", "R", "Q", "K", "p", "n", "b", "r", "q", "k"]
            random.seed(42)
            num_pieces = random.randint(12, 22)
            
            occupied_cells = set()
            for _ in range(num_pieces):
                px = random.randint(0, 7)
                py = random.randint(0, 7)
                if (px, py) not in occupied_cells:
                    occupied_cells.add((px, py))
                    char = random.choice(pieces)
                    cx = int(px * cell_size + cell_size // 4)
                    cy = int(py * cell_size + cell_size // 6)
                    try:
                        font = get_font(int(cell_size * 0.6))
                        text_color = (15, 15, 15) if char.islower() else (250, 250, 250)
                        draw.text((cx, cy), char.upper(), fill=text_color, font=font)
                    except:
                        pass
                        
            if label == "checkmate":
                kx = random.randint(0, 7)
                ky = random.randint(0, 7)
                cx1 = int(kx * cell_size)
                cy1 = int(ky * cell_size)
                cx2 = int((kx + 1) * cell_size)
                cy2 = int((ky + 1) * cell_size)
                draw.rectangle([cx1, cy1, cx2, cy2], outline=(255, 10, 10), width=3)
                try:
                    font = get_font(int(cell_size * 0.6))
                    draw.text((cx1 + int(cell_size // 4), cy1 + int(cell_size // 6)), "K", fill=(255, 10, 10), font=font)
                except:
                    pass
            random.seed()
            
        return img

    def generate_image(self, dataset_type: str, label: str, size: int, noise_level: str) -> Image.Image:
        dataset_type_clean = dataset_type.lower()
        label_clean = label.lower()

        if dataset_type_clean == "shapes":
            img = self.generate_shape(label_clean, size)
        elif dataset_type_clean == "ocr":
            digit = int(label_clean)
            img = self.generate_ocr_digit(digit, size)
        elif dataset_type_clean == "colors":
            img = self.generate_color_pattern(label_clean, size)
        elif dataset_type_clean == "mri":
            is_tumor = (label_clean == "tumor")
            img = self.generate_brain_mri(is_tumor, size)
        elif dataset_type_clean == "defects":
            is_defect = (label_clean == "defect")
            img = self.generate_defect(is_defect, size)
        elif dataset_type_clean == "barcodes":
            is_qr = (label_clean == "qr_code")
            img = self.generate_barcode_qr(is_qr, size)
        elif dataset_type_clean == "cells":
            is_sickle = (label_clean == "sickle_cell")
            img = self.generate_cells(is_sickle, size)
        elif dataset_type_clean == "signs":
            img = self.generate_traffic_sign(label_clean, size)
        elif dataset_type_clean == "satellite":
            img = self.generate_satellite(label_clean, size)
        elif dataset_type_clean == "captcha":
            img, _ = self.generate_captcha(label_clean, size)
        elif dataset_type_clean == "plates":
            img = self.generate_license_plate(label_clean, size)
        elif dataset_type_clean == "digital":
            img = self.generate_digital_digit(label_clean, size)
        elif dataset_type_clean == "aruco":
            img = self.generate_aruco_marker(label_clean, size)
        elif dataset_type_clean == "ecg":
            img = self.generate_ecg_waveform(label_clean, size)
        elif dataset_type_clean == "chess":
            img = self.generate_chess_board(label_clean, size)
        else:
            # Fallback
            img = self.generate_shape("circle", size)

        # Apply final noise overlay (salt/pepper and line scratches)
        img = self.add_noise(img, noise_level)
        return img

def create_image_dataset_zip(
    dataset_type: str,
    num_images_per_class: int,
    size: int,
    noise_level: str,
    split_ratio: float = 0.8
) -> io.BytesIO:
    # 1. Resolve classes based on dataset type
    dataset_type_clean = dataset_type.lower()
    classes = []
    if dataset_type_clean == "shapes":
        classes = ["circle", "square", "triangle"]
    elif dataset_type_clean == "ocr":
        classes = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    elif dataset_type_clean == "colors":
        classes = ["solid", "gradient", "checkerboard"]
    elif dataset_type_clean == "barcodes":
        classes = ["barcode", "qr_code"]
    elif dataset_type_clean == "signs":
        classes = ["stop", "yield", "speed_limit"]
    elif dataset_type_clean == "captcha":
        classes = ["4_characters", "5_characters", "6_characters"]
    elif dataset_type_clean == "plates":
        classes = ["white_plate", "yellow_plate", "blue_plate"]
    elif dataset_type_clean == "digital":
        classes = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    elif dataset_type_clean == "aruco":
        classes = ["marker_id_0", "marker_id_1", "marker_id_2"]
    elif dataset_type_clean == "ecg":
        classes = ["normal", "arrhythmia", "v_fib"]
    elif dataset_type_clean == "chess":
        classes = ["empty_board", "active_game", "checkmate"]
    else:
        classes = ["class_a", "class_b"]

    generator = SyntheticImageGenerator()
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        metadata_rows = []

        # 2. Loop through classes and generate images
        for cls in classes:
            # Determine split counts
            train_count = int(num_images_per_class * split_ratio)
            
            for idx in range(num_images_per_class):
                is_train = (idx < train_count)
                split_folder = "train" if is_train else "val"
                
                # Generate actual image & check if captcha needs text transcription
                if dataset_type_clean == "captcha":
                    img, captcha_str = generator.generate_captcha(cls, size)
                    img = generator.add_noise(img, noise_level)
                else:
                    img = generator.generate_image(dataset_type_clean, cls, size, noise_level)
                    captcha_str = None
                
                # Save image to bytes
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format="PNG")
                img_bytes = img_byte_arr.getvalue()
                
                # Write to zip file path
                filename = f"{split_folder}/{cls}/img_{idx:04d}.png"
                zip_file.writestr(filename, img_bytes)
                
                # Add to metadata index
                if captcha_str is not None:
                    metadata_rows.append([filename, cls, captcha_str])
                else:
                    metadata_rows.append([filename, cls])

        # 3. Create metadata.csv
        csv_buffer = io.StringIO()
        csv_writer = csv.writer(csv_buffer)
        if dataset_type_clean == "captcha":
            csv_writer.writerow(["filename", "label", "transcription"])
        else:
            csv_writer.writerow(["filename", "label"])
        csv_writer.writerows(metadata_rows)
        
        # Write CSV to zip root
        zip_file.writestr("metadata.csv", csv_buffer.getvalue())

    zip_buffer.seek(0)
    return zip_buffer
