"""Create a visually stable PDF from the reviewed 2x slide renders.

The accompanying slides.pptx retains editable text. Raster PDF pages avoid the
bundled LibreOffice Korean font-loss issue observed during this task.
Run slides.source.mjs before this script, using the bundled Codex runtime.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

root = Path(__file__).resolve().parent.parent
build = root / '.presentation-build'
output = root / 'submission' / 'slides.pdf'
c = canvas.Canvas(str(output), pagesize=(960, 540), pageCompression=1)
c.setTitle('YOKOBU - Clinic Simulation Demo')
c.setAuthor('YOKOBU team')
c.setSubject('Five-slide fictional demonstration. No actual clinic call.')
for number in range(1, 6):
    c.drawImage(ImageReader(str(build / f'slide-{number}.png')),
                0, 0, width=960, height=540, preserveAspectRatio=True)
    c.showPage()
c.save()
print(output)
