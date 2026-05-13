"""
Lector de facturas PDF
Extrae campos clave: número de factura, fecha, proveedor, cliente,
subtotal, impuestos y total.
"""

import re
import sys
import json
import argparse
from pathlib import Path

import pypdfium2 as pdfium


# ---------------------------------------------------------------------------
# Patrones de extracción
# ---------------------------------------------------------------------------

PATTERNS = {
    "numero_factura": [
        r"(?:factura|invoice|n[°º]?\s*factura|fact\.?)\s*[:#\-]?\s*([A-Z0-9\-/]+)",
        r"(?:comprobante|receipt)\s*[:#\-]?\s*([A-Z0-9\-/]+)",
        r"\b(?:N[°º]|No\.?)\s*([A-Z0-9\-/]{4,})",
    ],
    "fecha": [
        r"(?:fecha|date|emisi[oó]n|issued?)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})",
        r"(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})",
    ],
    "proveedor": [
        r"(?:emisor|proveedor|vendedor|raz[oó]n social|empresa|supplier|vendor|from)\s*[:\-]?\s*([A-ZÁÉÍÓÚ][^\n]{3,60})",
        r"(?:facturado por|billed by)\s*[:\-]?\s*([A-ZÁÉÍÓÚ][^\n]{3,60})",
    ],
    "cliente": [
        r"(?:cliente|comprador|receptor|customer|bill to|sold to)\s*[:\-]?\s*([A-ZÁÉÍÓÚ][^\n]{3,60})",
        r"(?:facturado a|señor(?:es)?|sr\.?)\s*[:\-]?\s*([A-ZÁÉÍÓÚ][^\n]{3,60})",
    ],
    "cuit_rfc": [
        r"(?:CUIT|RFC|RUC|NIF|CIF|tax\s*id)\s*[:\-]?\s*([\d\-X]{8,20})",
    ],
    "subtotal": [
        r"(?:subtotal|sub\s*total|neto|net amount)\s*[:\$]?\s*\$?\s*([\d.,]+)",
    ],
    "impuesto_iva": [
        r"(?:iva|igv|tax|impuesto|vat)\s*(?:\d+\s*%?)?\s*[:\$]?\s*\$?\s*([\d.,]+)",
    ],
    "total": [
        r"(?:total\s*(?:a\s*pagar)?|importe\s*total|gran\s*total|amount\s*due|total\s*amount)\s*[:\$]?\s*\$?\s*([\d.,]+)",
        r"(?:total)\s*[:\$]\s*\$?\s*([\d.,]+)",
    ],
    "moneda": [
        r"\b(USD|ARS|EUR|MXN|CLP|COP|PEN|BRL)\b",
        r"(\$|€|£|US\$)",
    ],
}


# ---------------------------------------------------------------------------
# Funciones de extracción
# ---------------------------------------------------------------------------

def extraer_texto(ruta_pdf: str) -> str:
    """Lee todas las páginas del PDF y devuelve el texto concatenado."""
    texto_completo = []
    pdf = pdfium.PdfDocument(ruta_pdf)
    for i in range(len(pdf)):
        page = pdf[i]
        textpage = page.get_textpage()
        texto = textpage.get_text_range()
        if texto:
            texto_completo.append(texto)
    return "\n".join(texto_completo)


def buscar_campo(texto: str, campo: str) -> str | None:
    """Aplica los patrones del campo sobre el texto (case-insensitive)."""
    for patron in PATTERNS[campo]:
        match = re.search(patron, texto, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def extraer_campos(texto: str) -> dict:
    """Extrae todos los campos definidos en PATTERNS."""
    resultado = {}
    for campo in PATTERNS:
        valor = buscar_campo(texto, campo)
        resultado[campo] = valor if valor else "No encontrado"
    return resultado


def imprimir_resultado(campos: dict, ruta: str):
    """Muestra los campos extraídos de forma legible."""
    separador = "─" * 50
    print(f"\n{'═' * 50}")
    print(f"  DATOS EXTRAÍDOS DE LA FACTURA")
    print(f"  Archivo: {Path(ruta).name}")
    print(f"{'═' * 50}")
    etiquetas = {
        "numero_factura": "Número de factura",
        "fecha":          "Fecha",
        "proveedor":      "Proveedor / Emisor",
        "cliente":        "Cliente / Receptor",
        "cuit_rfc":       "CUIT / RFC / NIF",
        "subtotal":       "Subtotal",
        "impuesto_iva":   "IVA / Impuesto",
        "total":          "Total",
        "moneda":         "Moneda",
    }
    for clave, etiqueta in etiquetas.items():
        valor = campos.get(clave, "No encontrado")
        estado = "✓" if valor != "No encontrado" else "✗"
        print(f"  {estado}  {etiqueta:<22} {valor}")
    print(separador)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Extrae campos de facturas en PDF"
    )
    parser.add_argument("pdf", help="Ruta al archivo PDF de la factura")
    parser.add_argument(
        "--json", action="store_true",
        help="Mostrar resultado como JSON"
    )
    parser.add_argument(
        "--campo", metavar="CAMPO",
        help=f"Extraer solo un campo específico: {', '.join(PATTERNS.keys())}"
    )
    args = parser.parse_args()

    ruta = args.pdf
    if not Path(ruta).exists():
        print(f"Error: no se encontró el archivo '{ruta}'")
        sys.exit(1)
    if not ruta.lower().endswith(".pdf"):
        print("Advertencia: el archivo no tiene extensión .pdf")

    texto = extraer_texto(ruta)
    if not texto.strip():
        print("Error: no se pudo extraer texto del PDF (puede ser una imagen escaneada).")
        sys.exit(1)

    if args.campo:
        if args.campo not in PATTERNS:
            print(f"Campo '{args.campo}' no reconocido. Disponibles: {', '.join(PATTERNS.keys())}")
            sys.exit(1)
        valor = buscar_campo(texto, args.campo)
        print(valor or "No encontrado")
        return

    campos = extraer_campos(texto)

    if args.json:
        print(json.dumps(campos, ensure_ascii=False, indent=2))
    else:
        imprimir_resultado(campos, ruta)


if __name__ == "__main__":
    main()
