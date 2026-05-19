"""
Lector de facturas PDF con OCR
Extrae campos clave de facturas tanto nativas (texto embebido)
como escaneadas (imágenes), usando Tesseract OCR como fallback.
"""

import re
import sys
import json
import argparse
import tempfile
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import pytesseract
import pypdfium2 as pdfium
from PIL import Image


# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

OCR_DPI = 300          # Resolución para renderizar páginas al hacer OCR
OCR_SCALE = OCR_DPI / 72  # pypdfium2 usa 72 DPI como base
MIN_CHARS_POR_PAGINA = 80  # Menos de esto → la página se considera imagen escaneada
TESSERACT_CONFIG = "--oem 3 --psm 6"  # LSTM engine, segmentación automática de página
LANGS_OCR = "spa+eng"  # Idiomas Tesseract


# ---------------------------------------------------------------------------
# Patrones de extracción
# ---------------------------------------------------------------------------

PATTERNS: dict[str, list[str]] = {
    "numero_factura": [
        # "N Factura: 0001" o "N° Factura 0001"
        r"[Nn][°º\s]?\s*[Ff]actura\s*[:#\-\.]?\s*([A-Z0-9][\dA-Z\-/]{2,19})",
        # "Factura: A-0001" — requiere separador para evitar capturar "FACTURA" solo
        r"\bfactura\s*[:#\-\.]\s*([A-Z0-9][\dA-Z\-/]{2,19})",
        r"\binvoice\s*[:#\-\.]?\s*([A-Z0-9][\dA-Z\-/]{2,19})",
        r"(?:comprobante|n[°º]\s*comp\.?|receipt)\s*[:#\-\.]?\s*([A-Z0-9][\dA-Z\-/]{2,19})",
        r"\b(?:N[°º]|No\.|Nro\.)\s*([A-Z0-9][\dA-Z\-/]{3,19})\b",
        r"(?:folio|voucher)\s*[:#\-\.]?\s*([A-Z0-9][\dA-Z\-/]{2,19})",
    ],
    "fecha": [
        r"(?:fecha(?:\s*de\s*emisi[oó]n)?|date|issued?(?:\s*on)?|emitida?)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})",
        r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b",
        r"\b(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b",
    ],
    "proveedor": [
        r"(?:emisor|proveedor|vendedor|raz[oó]n\s*social|supplier|vendor)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,80})",
        r"(?:facturado\s*por|billed\s*by|from)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,80})",
        r"(?:empresa|company)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,80})",
    ],
    "cliente": [
        r"(?:cliente|comprador|receptor|destinatario|customer|bill\s*to|sold\s*to)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,80})",
        r"(?:facturado\s*a|señor(?:es)?|sr\.?|sra\.?)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,80})",
        r"(?:to|para)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ][^\n]{3,80})",
    ],
    "cuit_rfc": [
        r"(?:CUIT|CUIL)\s*[:\.\-]?\s*(\d{2}[\-\s]?\d{8}[\-\s]?\d{1})",
        r"(?:RFC)\s*[:\.\-]?\s*([A-Z]{3,4}\d{6}[A-Z0-9]{3})",
        r"(?:RUC|NIF|CIF|DNI|tax\s*id|vat\s*(?:no|number|n[°º]))\s*[:\.\-]?\s*([\dA-Z][\d\-A-Z]{7,19})",
    ],
    "subtotal": [
        r"(?:subtotal|sub[\s\-]?total|base\s*imponible|neto|net\s*amount)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)",
        r"(?:importe\s*neto|amount\s*before\s*tax)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)",
    ],
    "impuesto_iva": [
        r"(?:iva|igv|vat|tax|impuesto)\s*(?:\(?(?:21|19|16|10|12|18)\s*%?\)?)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)",
        r"(?:i\.?v\.?a\.?|i\.?g\.?v\.?)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)",
    ],
    "total": [
        # Más específico primero: "total a pagar", "total general", etc.
        r"(?:total\s*(?:a\s*)?pagar|importe\s*total|gran\s*total|amount\s*due|total\s*amount|total\s*invoice|total\s*general|total\s*facturado)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)",
        r"(?:monto\s*total|suma\s*total)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)",
        # "Total:" solo — al final (evitar confundir con subtotal buscando primero los anteriores)
        r"(?<!\w)total\s*[:\.\$]\s*\$?\s*([\d\.,]+)",
    ],
    "moneda": [
        r"\b(USD|ARS|EUR|MXN|CLP|COP|PEN|BRL|BOB|UYU|PYG)\b",
        r"(US\$|AR\$|\$|€|£|R\$)",
    ],
    "numero_orden": [
        r"(?:orden\s*(?:de\s*(?:compra|pedido))?|purchase\s*order|p\.?o\.?)\s*[:#\-]?\s*([A-Z0-9\-/]{3,20})",
        r"(?:order\s*(?:no|number|n[°º]))\s*[:#\-]?\s*([A-Z0-9\-/]{3,20})",
    ],
    "condicion_pago": [
        r"(?:condici[oó]n\s*(?:de\s*)?pago|payment\s*(?:terms?|condition))\s*[:\.\-]?\s*([^\n]{3,50})",
        r"(?:forma\s*(?:de\s*)?pago|payment\s*method)\s*[:\.\-]?\s*([^\n]{3,50})",
    ],
    "vencimiento": [
        r"(?:vencimiento|fecha\s*(?:de\s*)?vencimiento|due\s*date|payment\s*due)\s*[:\.\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
    ],
}

# ---------------------------------------------------------------------------
# Correcciones de errores OCR comunes en español
# ---------------------------------------------------------------------------

OCR_CORRECCIONES = [
    # Letras que Tesseract confunde frecuentemente
    (r"\bSubtota[lt]\b",      "Subtotal"),
    (r"\bTota[lt]a?\b",       "Total"),
    (r"\bVencimienta\b",      "Vencimiento"),
    (r"\bCondicion\b",        "Condición"),
    (r"\bFacfura\b",          "Factura"),
    (r"\bC[Ll][Ll][TI][TI]\b", "CUIT"),
    (r"\bCliente[;,]\b",      "Cliente:"),
    (r"\bFecha[;,]\b",        "Fecha:"),
    # Separadores OCR: punto usado como dos puntos
    (r"(?<=[A-Za-záéíóúñÁÉÍÓÚÑ]{4})\.\s+(?=[A-Z0-9$])", ": "),
]


def normalizar_texto_ocr(texto: str) -> str:
    """Aplica correcciones heurísticas sobre errores típicos de OCR."""
    for patron, reemplazo in OCR_CORRECCIONES:
        texto = re.sub(patron, reemplazo, texto, flags=re.IGNORECASE)
    return texto


ETIQUETAS = {
    "numero_factura":  "Número de factura",
    "fecha":           "Fecha de emisión",
    "vencimiento":     "Vencimiento",
    "proveedor":       "Proveedor / Emisor",
    "cliente":         "Cliente / Receptor",
    "cuit_rfc":        "CUIT / RFC / NIF",
    "numero_orden":    "Orden de compra",
    "condicion_pago":  "Condición de pago",
    "moneda":          "Moneda",
    "subtotal":        "Subtotal",
    "impuesto_iva":    "IVA / Impuesto",
    "total":           "Total",
}


# ---------------------------------------------------------------------------
# Pre-procesamiento de imagen para OCR
# ---------------------------------------------------------------------------

def _deskew(imagen: np.ndarray) -> np.ndarray:
    """Corrige la inclinación de la imagen detectando el ángulo de texto."""
    gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY) if len(imagen.shape) == 3 else imagen
    _, binaria = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = np.column_stack(np.where(binaria > 0))
    if len(coords) < 100:
        return imagen
    angulo = cv2.minAreaRect(coords)[-1]
    # cv2.minAreaRect devuelve ángulos entre -90 y 0; ajustamos a [-45, 45]
    if angulo < -45:
        angulo = 90 + angulo
    if abs(angulo) < 0.5:  # inclinación despreciable
        return imagen
    h, w = imagen.shape[:2]
    centro = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(centro, angulo, 1.0)
    return cv2.warpAffine(imagen, M, (w, h), flags=cv2.INTER_CUBIC,
                           borderMode=cv2.BORDER_REPLICATE)


def _eliminar_ruido(imagen: np.ndarray) -> np.ndarray:
    """Aplica eliminación de ruido conservando bordes de texto."""
    return cv2.fastNlMeansDenoising(imagen, h=10, templateWindowSize=7, searchWindowSize=21)


def preprocesar_para_ocr(imagen: np.ndarray) -> np.ndarray:
    """
    Pipeline completo de preprocesamiento:
    1. Escala de grises
    2. Eliminación de ruido
    3. Corrección de inclinación
    4. Binarización adaptativa
    5. Escalado si la imagen es muy pequeña
    """
    # 1. Escala de grises
    if len(imagen.shape) == 3:
        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
    else:
        gris = imagen.copy()

    # 2. Escalado mínimo para OCR confiable (al menos 1000px de ancho)
    h, w = gris.shape
    if w < 1000:
        factor = 1000 / w
        gris = cv2.resize(gris, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC)

    # 3. Eliminación de ruido
    gris = _eliminar_ruido(gris)

    # 4. Corrección de inclinación (sobre la imagen con ruido ya eliminado)
    gris = _deskew(gris)

    # 5. Binarización adaptativa (mejor para documentos con iluminación irregular)
    binaria = cv2.adaptiveThreshold(
        gris, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=10
    )

    # 6. Morfología suave para unir trazos de letras rotos
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    binaria = cv2.morphologyEx(binaria, cv2.MORPH_CLOSE, kernel)

    return binaria


# ---------------------------------------------------------------------------
# Extracción de texto
# ---------------------------------------------------------------------------

def _pagina_a_imagen(page: pdfium.PdfPage) -> np.ndarray:
    """Renderiza una página PDF a imagen numpy en alta resolución."""
    bitmap = page.render(scale=OCR_SCALE, rotation=0)
    pil_img = bitmap.to_pil()
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def _ocr_pagina(page: pdfium.PdfPage, verbose: bool = False) -> str:
    """Aplica el pipeline OCR completo a una página PDF."""
    imagen_raw = _pagina_a_imagen(page)
    imagen_proc = preprocesar_para_ocr(imagen_raw)
    pil_proc = Image.fromarray(imagen_proc)
    texto = pytesseract.image_to_string(
        pil_proc,
        lang=LANGS_OCR,
        config=TESSERACT_CONFIG,
    )
    if verbose:
        print(f"    [OCR] Caracteres extraídos: {len(texto.strip())}")
    return texto


def extraer_texto(
    ruta_pdf: str,
    forzar_ocr: bool = False,
    verbose: bool = False,
) -> tuple[str, str]:
    """
    Extrae texto de todas las páginas del PDF.

    Estrategia por página:
    - Si tiene texto embebido suficiente → extracción nativa (rápida y exacta).
    - Si está vacía o tiene muy poco texto → OCR con preprocesamiento de imagen.

    Returns:
        (texto_completo, metodo_usado)
        metodo_usado: 'nativo', 'ocr' o 'mixto'
    """
    pdf = pdfium.PdfDocument(ruta_pdf)
    n_paginas = len(pdf)
    paginas_nativas = 0
    paginas_ocr = 0
    partes = []

    for i in range(n_paginas):
        if verbose:
            print(f"  Procesando página {i + 1}/{n_paginas}...")

        page = pdf[i]

        # Intento de extracción nativa
        texto_nativo = ""
        if not forzar_ocr:
            textpage = page.get_textpage()
            texto_nativo = textpage.get_text_range() or ""

        if not forzar_ocr and len(texto_nativo.strip()) >= MIN_CHARS_POR_PAGINA:
            partes.append(texto_nativo)
            paginas_nativas += 1
            if verbose:
                print(f"    [Nativo] {len(texto_nativo.strip())} caracteres.")
        else:
            if verbose:
                motivo = "forzado" if forzar_ocr else f"solo {len(texto_nativo.strip())} chars nativos"
                print(f"    Usando OCR ({motivo})...")
            texto_ocr = _ocr_pagina(page, verbose=verbose)
            # Si el OCR tampoco produce texto, conservamos el nativo (aunque sea poco)
            if texto_ocr.strip():
                partes.append(texto_ocr)
            elif texto_nativo.strip():
                partes.append(texto_nativo)
            paginas_ocr += 1

    texto_final = "\n".join(partes)

    # Normalizar errores OCR cuando al menos una página fue procesada con OCR
    if paginas_ocr > 0:
        texto_final = normalizar_texto_ocr(texto_final)

    if paginas_nativas == 0:
        metodo = "ocr"
    elif paginas_ocr == 0:
        metodo = "nativo"
    else:
        metodo = "mixto"

    if verbose:
        print(f"\n  Método: {metodo} | Páginas nativas: {paginas_nativas} | OCR: {paginas_ocr}")
        print(f"  Total caracteres extraídos: {len(texto_final.strip())}\n")

    return texto_final, metodo


# ---------------------------------------------------------------------------
# Extracción de campos
# ---------------------------------------------------------------------------

def buscar_campo(texto: str, campo: str) -> Optional[str]:
    """Aplica los patrones del campo sobre el texto (case-insensitive)."""
    for patron in PATTERNS[campo]:
        match = re.search(patron, texto, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()
    return None


def extraer_campos(texto: str) -> dict:
    """Extrae todos los campos definidos en PATTERNS."""
    return {
        campo: (buscar_campo(texto, campo) or "No encontrado")
        for campo in PATTERNS
    }


def _contar_encontrados(campos: dict) -> tuple[int, int]:
    total = len(campos)
    encontrados = sum(1 for v in campos.values() if v != "No encontrado")
    return encontrados, total


# ---------------------------------------------------------------------------
# Presentación del resultado
# ---------------------------------------------------------------------------

def imprimir_resultado(campos: dict, ruta: str, metodo: str, verbose_text: str = ""):
    """Muestra los campos extraídos de forma legible en consola."""
    sep = "─" * 52
    doble = "═" * 52

    print(f"\n{doble}")
    print(f"  DATOS EXTRAÍDOS DE LA FACTURA")
    print(f"  Archivo : {Path(ruta).name}")
    print(f"  Método  : {metodo.upper()}")
    encontrados, total = _contar_encontrados(campos)
    print(f"  Campos  : {encontrados}/{total} encontrados")
    print(doble)

    for clave, etiqueta in ETIQUETAS.items():
        valor = campos.get(clave, "No encontrado")
        icono = "✓" if valor != "No encontrado" else "✗"
        print(f"  {icono}  {etiqueta:<26} {valor}")

    print(sep)

    if verbose_text:
        print("\n[TEXTO EXTRAÍDO COMPLETO]")
        print(sep)
        print(verbose_text[:3000] + ("..." if len(verbose_text) > 3000 else ""))
        print(sep)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extrae campos de facturas PDF (texto nativo + OCR para escaneados)",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("pdf", help="Ruta al archivo PDF de la factura")
    parser.add_argument(
        "--json", action="store_true",
        help="Mostrar resultado como JSON",
    )
    parser.add_argument(
        "--campo", metavar="CAMPO",
        help="Extraer solo un campo. Opciones:\n  " + "\n  ".join(PATTERNS.keys()),
    )
    parser.add_argument(
        "--ocr", action="store_true",
        help="Forzar OCR en todas las páginas (ignorar texto embebido)",
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Mostrar progreso y texto completo extraído",
    )
    parser.add_argument(
        "--texto", action="store_true",
        help="Imprimir el texto crudo extraído sin procesar campos",
    )
    return parser


def main():
    parser = construir_parser()
    args = parser.parse_args()

    ruta = args.pdf

    if not Path(ruta).exists():
        print(f"Error: no se encontró el archivo '{ruta}'", file=sys.stderr)
        sys.exit(1)
    if not ruta.lower().endswith(".pdf"):
        print("Advertencia: el archivo no tiene extensión .pdf", file=sys.stderr)

    if args.verbose:
        print(f"Leyendo: {ruta}")

    try:
        texto, metodo = extraer_texto(ruta, forzar_ocr=args.ocr, verbose=args.verbose)
    except Exception as e:
        print(f"Error al procesar el PDF: {e}", file=sys.stderr)
        sys.exit(1)

    if not texto.strip():
        print("Error: no se pudo extraer texto del PDF.", file=sys.stderr)
        sys.exit(1)

    # Solo mostrar texto crudo
    if args.texto:
        print(texto)
        return

    # Extraer campo único
    if args.campo:
        if args.campo not in PATTERNS:
            print(
                f"Campo '{args.campo}' no reconocido.\nDisponibles: {', '.join(PATTERNS.keys())}",
                file=sys.stderr,
            )
            sys.exit(1)
        valor = buscar_campo(texto, args.campo)
        print(valor or "No encontrado")
        return

    campos = extraer_campos(texto)

    if args.json:
        salida = {
            "archivo": str(Path(ruta).name),
            "metodo_extraccion": metodo,
            "campos": campos,
        }
        print(json.dumps(salida, ensure_ascii=False, indent=2))
    else:
        texto_verbose = texto if args.verbose else ""
        imprimir_resultado(campos, ruta, metodo, verbose_text=texto_verbose)


if __name__ == "__main__":
    main()
