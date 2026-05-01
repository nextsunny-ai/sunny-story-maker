"""설치 도우미 — SVG 아이콘 → ICO 변환 + 바탕화면 단축키 생성
한 번만 실행하면 작가가 바탕화면에서 클릭해서 바로 사용 가능."""

import os
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
SVG_PATH = ROOT / "assets" / "icon.svg"
ICO_PATH = ROOT / "assets" / "icon.ico"
PNG_PATH = ROOT / "assets" / "icon.png"
RUN_BAT = ROOT / "run.bat"


def svg_to_png(svg_path: Path, png_path: Path, size: int = 512):
    """SVG → PNG. cairosvg 우선, 없으면 PIL 대체."""
    try:
        import cairosvg
        cairosvg.svg2png(
            url=str(svg_path),
            write_to=str(png_path),
            output_width=size,
            output_height=size,
        )
        return True
    except ImportError:
        pass

    # cairosvg 없으면 미리 임베드된 폴백 PNG 생성 (PIL로 단색 라운드 사각형)
    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        # 그라데이션 비슷하게 (단색 fallback)
        margin = size // 16
        draw.rounded_rectangle(
            [(margin, margin), (size - margin, size - margin)],
            radius=size // 6,
            fill=(37, 99, 235, 255),
        )
        # 가운데 흰색 종이 사각형
        pm = size // 4
        draw.rounded_rectangle(
            [(pm, pm), (size - pm, size - pm)],
            radius=size // 32,
            fill=(255, 255, 255, 230),
        )
        # S 모노그램
        try:
            font = ImageFont.truetype("malgun.ttf", size // 3)
        except OSError:
            font = ImageFont.load_default()
        draw.text((size // 2, size // 2), "S", fill=(37, 99, 235, 255), font=font, anchor="mm")
        img.save(png_path, "PNG")
        return True
    except ImportError:
        return False


def png_to_ico(png_path: Path, ico_path: Path):
    """PNG → ICO (다중 사이즈)"""
    try:
        from PIL import Image
        img = Image.open(png_path)
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        img.save(
            ico_path,
            format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
        )
        return True
    except ImportError:
        return False


def create_desktop_shortcut(target_bat: Path, icon_ico: Path, name: str = "SUNNY Story Maker") -> Path:
    """윈도우 바탕화면에 .lnk 단축키 생성"""
    desktop = Path(os.path.join(os.path.expanduser("~"), "Desktop"))
    if not desktop.exists():
        # OneDrive 데스크톱
        onedrive_desktop = Path(os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop"))
        if onedrive_desktop.exists():
            desktop = onedrive_desktop

    lnk_path = desktop / f"{name}.lnk"

    # PowerShell로 .lnk 생성
    ps_script = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{lnk_path}")
$Shortcut.TargetPath = "{target_bat}"
$Shortcut.WorkingDirectory = "{target_bat.parent}"
$Shortcut.IconLocation = "{icon_ico}"
$Shortcut.Description = "한국어 시나리오 작가 도구 (12장르 + 다중 타겟 리뷰)"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
"""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"단축키 생성 실패: {result.stderr}")
    return lnk_path


def install_desktop_shortcut():
    """SVG → ICO 변환 + 바탕화면 단축키 한방 설치"""
    print("아이콘 변환 중...")

    # 1. SVG → PNG
    if not svg_to_png(SVG_PATH, PNG_PATH):
        print("[경고] SVG 변환 실패. 기본 아이콘 사용.")

    # 2. PNG → ICO
    if PNG_PATH.exists():
        if not png_to_ico(PNG_PATH, ICO_PATH):
            print("[경고] ICO 변환 실패. .lnk는 기본 아이콘 사용.")

    # 3. 단축키 생성
    if RUN_BAT.exists():
        try:
            lnk = create_desktop_shortcut(RUN_BAT, ICO_PATH, "SUNNY Story Maker")
            print(f"✓ 바탕화면 단축키 생성: {lnk}")
        except Exception as e:
            print(f"[에러] 단축키 생성: {e}")
            sys.exit(1)
    else:
        print(f"[에러] {RUN_BAT} 파일이 없습니다.")
        sys.exit(1)


if __name__ == "__main__":
    install_desktop_shortcut()
