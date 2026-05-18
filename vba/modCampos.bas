Attribute VB_Name = "modCampos"
Option Explicit

' ==============================================================
' modCampos  -  Extraccion de campos de factura/documento legal
'               mediante RegExp (VBScript.RegExp nativo Windows)
'
' Tipos de documento soportados:
'   Facturas, Poderes, Demandas, Informes, Siniestros
'
' NOTA: VBScript.RegExp no soporta lookbehind;
'       los patrones estan adaptados para evitarlo.
' ==============================================================

' Tipo publico que representa un campo extraido
Public Type CampoFactura
    Nombre   As String   ' clave interna
    Etiqueta As String   ' texto visible al usuario
    Valor    As String   ' valor extraido (o "No encontrado")
End Type

' ==============================================================
' SECCION A  -  Campos generales (comunes a todos los documentos)
' ==============================================================

' ---------------------------------------------------------------
' Devuelve el array completo de campos extraidos del texto.
' Incluye campos legales/siniestro + montos desagregados.
' ---------------------------------------------------------------
Public Function ExtraerCampos(ByVal texto As String) As CampoFactura()
    texto = NormalizarTextoOCR(texto)

    ' --- ATENCION: actualizar el indice maximo si se agregan campos ---
    Dim campos(19) As CampoFactura

    ' ── Identificacion del documento ─────────────────────────────
    campos(0) = ExtCampo(texto, "numero_factura", "Numero de factura", _
        Array( _
            "[Nn][" & Chr(176) & Chr(186) & "\s]?\s*[Ff]actura\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "\bfactura\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "\binvoice\s*[:#\-\.]?\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "comprobante\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "\bN[" & Chr(176) & Chr(186) & "\.]\s*([A-Z0-9][A-Z0-9\-/]{3,19})", _
            "\bfolio\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})"))

    ' ── Siniestro ────────────────────────────────────────────────
    ' Captura: "siniestro 737", "siniest. N° 737", "stro. 8484",
    '          "sin. 737", "STRO 8484", "6865>>"
    campos(1) = ExtCampo(texto, "numero_siniestro", "Siniestro N" & Chr(176), _
        Array( _
            "\bsiniestro\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,10})", _
            "\bsiniest\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,10})", _
            "\bsin\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,10})", _
            "\bstro\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,10})", _
            "(\d{3,10})\s*>>"))

    ' ── Expediente ───────────────────────────────────────────────
    ' Captura: "expediente 36838/18", "expte. 36838/18", "exp 36838/18",
    '          "causa 36838/18", "autos 36838/18"
    ' Formato tipico: NUMERO/AA o NUMERO/AAAA
    campos(2) = ExtCampo(texto, "numero_expediente", "Expediente (Exp/Expte)", _
        Array( _
            "\bexpediente\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,8}[\/\-]\d{2,4})", _
            "\bexpte\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,8}[\/\-]\d{2,4})", _
            "\bexp\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,8}[\/\-]\d{2,4})", _
            "\bcausa\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,8}[\/\-]\d{2,4})", _
            "\bautos\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{3,8}[\/\-]\d{2,4})", _
            "\bexpediente\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-\.]?\s*(\d{4,8})"))

    ' ── Fechas ───────────────────────────────────────────────────
    campos(3) = ExtCampo(texto, "fecha", "Fecha", _
        Array( _
            "fecha\s*(?:de\s*emis[io][o" & Chr(243) & "]n)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
            "(?:date|issued?)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
            "(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})", _
            "^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})"))

    campos(4) = ExtCampo(texto, "vencimiento", "Vencimiento", _
        Array( _
            "vencimiento\s*[:\-\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
            "(?:due\s*date|payment\s*due)\s*[:\-\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})"))

    ' ── Partes ───────────────────────────────────────────────────
    campos(5) = ExtCampo(texto, "proveedor", "Proveedor / Emisor / Actor", _
        Array( _
            "(?:emisor|proveedor|vendedor|supplier|vendor)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "razon\s*social\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:facturado\s*por|billed\s*by)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:actor|actora|demandante)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:poderdante|mandante)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})"))

    campos(6) = ExtCampo(texto, "cliente", "Cliente / Receptor / Demandado", _
        Array( _
            "(?:cliente|comprador|receptor|customer)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:bill\s*to|sold\s*to)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "facturado\s*a\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:demandado|demandada)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:apoderado|mandatario)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})"))

    campos(7) = ExtCampo(texto, "cuit_rfc", "CUIT / CUIL / DNI", _
        Array( _
            "(?:CUIT|CUIL)\s*[:\.\-]?\s*(\d{2}[\-\s]?\d{8}[\-\s]?\d{1})", _
            "DNI\s*[:\.\-]?\s*(\d{7,8})", _
            "RFC\s*[:\.\-]?\s*([A-Z]{3,4}\d{6}[A-Z0-9]{3})", _
            "(?:RUC|NIF|CIF)\s*[:\.\-]?\s*([A-Z0-9][A-Z0-9\-]{7,19})"))

    ' ── Datos comerciales ────────────────────────────────────────
    campos(8) = ExtCampo(texto, "condicion_pago", "Condicion de pago", _
        Array( _
            "condici[o" & Chr(243) & "]n\s*de\s*pago\s*[:\-\.]\s*([^\r\n]{3,50})", _
            "payment\s*terms?\s*[:\-\.]\s*([^\r\n]{3,50})", _
            "forma\s*de\s*pago\s*[:\-\.]\s*([^\r\n]{3,50})"))

    campos(9) = ExtCampo(texto, "moneda", "Moneda", _
        Array( _
            "\b(USD|ARS|EUR|MXN|CLP|COP|PEN|BRL|BOB|UYU|PYG)\b", _
            "(US\$|AR\$)"))

    ' ==============================================================
    ' SECCION B  -  Montos desagregados
    ' ==============================================================

    campos(10) = ExtCampo(texto, "subtotal", "Subtotal / Neto", _
        Array( _
            "subtotal\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "(?:base\s*imponible|neto)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    campos(11) = ExtCampo(texto, "impuesto_iva", "IVA / Impuesto", _
        Array( _
            "IVA\s*(?:\(?(?:21|19|16|10|12|18)\s*%?\)?)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "I\.?V\.?A\.?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "(?:IGV|VAT|tax)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Capital reclamado / monto principal
    campos(12) = ExtCampo(texto, "capital", "Capital", _
        Array( _
            "capital\s*(?:reclamado|adeudado|asegurado|de\s*condena)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "monto\s*asegurado\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "suma\s*asegurada\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Intereses
    campos(13) = ExtCampo(texto, "intereses", "Intereses", _
        Array( _
            "intereses?\s*(?:compensatorios?|moratorios?|punitorios?)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "inter[eé]s\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Honorarios profesionales / de abogados
    campos(14) = ExtCampo(texto, "honorarios", "Honorarios", _
        Array( _
            "honorarios\s*(?:profesionales?|regulados?|del?\s*(?:letrado|abogado|perito))?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "(?:honorario|honores)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Costas y gastos procesales
    campos(15) = ExtCampo(texto, "costas", "Costas / Gastos", _
        Array( _
            "costas\s*(?:y\s*costos?|procesales?)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "gastos\s*(?:procesales?|judiciales?|de\s*justicia)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "tasa\s*de\s*justicia\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Danos y perjuicios
    campos(16) = ExtCampo(texto, "danos", "Danos y Perjuicios", _
        Array( _
            "da[n" & Chr(241) & "]os?\s*(?:y\s*perjuicios?)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "lucro\s*cesante\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "da[n" & Chr(241) & "o]\s*(?:moral|material|emergente)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Multas / Recargos
    campos(17) = ExtCampo(texto, "multa", "Multa / Recargo", _
        Array( _
            "multa\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "recargo\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "penalidad\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Total (el mas amplio, al final para no confundir con parciales)
    campos(18) = ExtCampo(texto, "total", "TOTAL A PAGAR / RECLAMAR", _
        Array( _
            "total\s*a\s*pagar\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "total\s*pagar\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "importe\s*total\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "gran\s*total\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "monto\s*total\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "total\s*reclamado\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "total\s*general\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "amount\s*due\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ' Resumen de TODOS los montos etiquetados encontrados en el doc
    campos(19) = ExtCampoMontosTodos(texto)

    ExtraerCampos = campos
End Function

' ---------------------------------------------------------------
' Campo especial: encuentra TODOS los montos etiquetados del doc.
' Devuelve una cadena con cada "Etiqueta: $monto" separada por /
' Util para documentos que tienen muchos importes distintos.
' ---------------------------------------------------------------
Private Function ExtCampoMontosTodos(ByVal texto As String) As CampoFactura
    Dim campo As CampoFactura
    campo.Nombre   = "montos_todos"
    campo.Etiqueta = "Todos los montos"
    campo.Valor    = "No encontrado"

    Dim re As Object
    Set re = CreateObject("VBScript.RegExp")
    re.IgnoreCase = True
    re.Global     = True
    re.MultiLine  = True

    ' Patron amplio: "palabra(s): $ monto" o "palabra(s) $ monto"
    re.Pattern = "([A-Za-z" & Chr(225) & Chr(233) & Chr(237) & Chr(243) & Chr(250) & Chr(241) & _
                 "]{3,}(?:\s+[A-Za-z" & Chr(225) & Chr(233) & Chr(237) & Chr(243) & Chr(250) & Chr(241) & "]{2,}){0,3})" & _
                 "\s*[:\-\.\$]?\s*\$\s*([\d]{1,3}(?:[,\.][\d]{3})*(?:[,\.][\d]{1,2})?)"

    Dim m As Object, mc As Object
    Set mc = re.Execute(texto)

    If mc.Count = 0 Then Exit Function

    ' Palabras a ignorar (demasiado genericas)
    Dim ignorar As String
    ignorar = "|de|el|la|los|las|y|en|que|con|del|al|se|le|por|un|una|su|" & _
              "para|como|pero|o|si|the|and|or|to|of|in|is|at|"

    Dim partes() As String
    ReDim partes(mc.Count - 1)
    Dim n As Integer
    n = 0

    Dim i As Integer
    For i = 0 To mc.Count - 1
        Dim etiq As String
        Dim monto As String
        etiq  = Trim(mc(i).SubMatches(0))
        monto = Trim(mc(i).SubMatches(1))

        ' Filtrar etiquetas que son solo palabras prohibidas o muy cortas
        If Len(etiq) >= 3 And InStr(ignorar, "|" & LCase(etiq) & "|") = 0 Then
            partes(n) = etiq & ": $" & monto
            n = n + 1
        End If
    Next i

    If n > 0 Then
        ReDim Preserve partes(n - 1)
        campo.Valor = Join(partes, "  /  ")
    End If

    ExtCampoMontosTodos = campo
End Function

' ---------------------------------------------------------------
' Busca un campo con una lista de patrones RegExp.
' Devuelve el primer SubMatch del primer patron que hace match.
' ---------------------------------------------------------------
Private Function ExtCampo(ByVal texto As String, _
                           ByVal nombre As String, _
                           ByVal etiqueta As String, _
                           ByVal patrones As Variant) As CampoFactura
    Dim campo As CampoFactura
    campo.Nombre   = nombre
    campo.Etiqueta = etiqueta
    campo.Valor    = "No encontrado"

    Dim re As Object
    Set re = CreateObject("VBScript.RegExp")
    re.IgnoreCase = True
    re.Global     = False
    re.MultiLine  = True

    Dim i As Integer
    For i = 0 To UBound(patrones)
        re.Pattern = CStr(patrones(i))
        Dim m As Object
        Set m = re.Execute(texto)
        If m.Count > 0 Then
            If m(0).SubMatches.Count > 0 Then
                campo.Valor = Trim(m(0).SubMatches(0))
            Else
                campo.Valor = Trim(m(0).Value)
            End If
            If Len(campo.Valor) > 0 Then Exit For
        End If
    Next i

    ExtCampo = campo
End Function

' ---------------------------------------------------------------
' Correcciones heuristicas de errores tipicos de OCR en espanol
' y normalizacion de abreviaturas legales/juridicas.
' VBScript.RegExp no soporta lookbehind; se usan grupos normales.
' ---------------------------------------------------------------
Public Function NormalizarTextoOCR(ByVal texto As String) As String
    Dim re As Object
    Set re = CreateObject("VBScript.RegExp")
    re.Global     = True
    re.IgnoreCase = True

    ' -- Errores de letras comunes en OCR --
    re.Pattern = "Subtota[lt]\b":          texto = re.Replace(texto, "Subtotal")
    re.Pattern = "Tota[lt]\s+a\s+paga[rn]": texto = re.Replace(texto, "Total a pagar")
    re.Pattern = "Tota[lt]a\s+paga[rn]":  texto = re.Replace(texto, "Total a pagar")
    re.Pattern = "Tota[lt]\s+paga[rn]":   texto = re.Replace(texto, "Total pagar")
    re.Pattern = "Vencimienta\b":          texto = re.Replace(texto, "Vencimiento")
    re.Pattern = "Facfura\b":             texto = re.Replace(texto, "Factura")
    re.Pattern = "C[Ll][Ll][TI][TI]\b":   texto = re.Replace(texto, "CUIT")
    re.Pattern = "I\.V\.A\.":             texto = re.Replace(texto, "IVA")
    re.Pattern = "IVA\s*(\d+)\s*%":       texto = re.Replace(texto, "IVA $1%")
    re.Pattern = "Sinlestro\b":           texto = re.Replace(texto, "Siniestro")
    re.Pattern = "S1niestro\b":           texto = re.Replace(texto, "Siniestro")
    re.Pattern = "Exped[il]ente\b":       texto = re.Replace(texto, "Expediente")
    re.Pattern = "Expt[eo]\b":            texto = re.Replace(texto, "Expte")

    ' -- Normalizar separador >> (puede aparecer como > > o >>>) --
    re.Pattern = ">\s*>+": texto = re.Replace(texto, ">>")

    ' -- Punto usado como dos puntos (letra+punto+espacio+MAYUS/digito) --
    re.Pattern = "([A-Za-z]{3,})\.\s+([A-Z0-9\$])"
    texto = re.Replace(texto, "$1: $2")

    ' -- Asegurar espacio entre numero/año en expediente si falta --
    '    Ejemplo: "36838/18" ya es correcto; "36838 /18" → "36838/18"
    re.Pattern = "(\d+)\s+\/\s*(\d{2,4})": texto = re.Replace(texto, "$1/$2")

    ' -- Eliminar caracteres de control excepto saltos de linea --
    re.Pattern = "[^\x09\x0A\x0D\x20-\xFF]"
    texto = re.Replace(texto, "")

    NormalizarTextoOCR = texto
End Function
