Attribute VB_Name = "modCampos"
Option Explicit

' ==============================================================
' modCampos  -  Extraccion de campos para documentos legales/
'               comerciales: Facturas, Siniestros, Demandas,
'               Poderes, Informes, Polizas.
'
' RENDIMIENTO: se reutiliza un unico objeto VBScript.RegExp
'   en lugar de crear uno nuevo por cada campo (era el cuello
'   de botella principal). Mejora ~20x en velocidad de parseo.
'
' TOTAL: 31 campos en 7 grupos.
' ==============================================================

Public Type CampoFactura
    Nombre   As String
    Etiqueta As String
    Valor    As String
End Type

' Objeto RegExp reutilizado (no se recrea en cada llamada)
Private m_re As Object

Private Sub RE()
    If m_re Is Nothing Then
        Set m_re = CreateObject("VBScript.RegExp")
        m_re.IgnoreCase = True
        m_re.Global     = False
        m_re.MultiLine  = True
    End If
End Sub

' ==============================================================
' EXTRACCION PRINCIPAL
' ==============================================================

Public Function ExtraerCampos(ByVal txt As String) As CampoFactura()
    txt = Limpiar(txt)

    Dim c(30) As CampoFactura   ' 31 campos, indices 0-30

    ' ── GRUPO 1: Identificacion del documento ──────────────────

    ' Factura/comprobante
    c(0) = F(txt, "numero_factura", "N" & Chr(176) & " Factura / Comprobante", _
        "(?:[Nn][" & Chr(176) & Chr(186) & ".]?\s*)?[Ff]actura\s*[:#\-.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
        "comprobante\s*[:#\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
        "\bfolio\s*[:#\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})")

    ' Siniestro: "siniestro 737", "stro. 8484", "6865>>", "sin. N° 737"
    c(1) = F(txt, "numero_siniestro", "Siniestro N" & Chr(176), _
        "\bsiniestro\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,10})", _
        "\bsiniest\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,10})", _
        "\bsin\.?\s+[Nn]?[" & Chr(176) & Chr(186) & "]?\s*(\d{3,10})", _
        "\bstro\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,10})", _
        "(\d{3,10})\s*>>")

    ' Expediente: "expte. 36838/18", "exp 36838/18", CUIJ, causa
    c(2) = F(txt, "numero_expediente", "Expediente (Exp/Expte)", _
        "\bexpediente\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,8}[\/]\d{2,4})", _
        "\bexpte\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,8}[\/]\d{2,4})", _
        "\bexp\.?\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,8}[\/]\d{2,4})", _
        "\bcausa\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,8}[\/]\d{2,4})", _
        "\bautos\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{3,8}[\/]\d{2,4})", _
        "\bCUIJ\s*[:#\-.]?\s*([A-Z0-9\-]{10,30})", _
        "\bexpediente\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*(\d{4,8})")

    ' Poliza de seguro
    c(3) = F(txt, "numero_poliza", "N" & Chr(176) & " Poliza", _
        "\bp[o" & Chr(243) & "]liza\s*[Nn]?[" & Chr(176) & Chr(186) & "]?\s*[:#\-.]?\s*([A-Z0-9][A-Z0-9\-/]{3,20})", _
        "\bpliza\s*[:#\-.]?\s*([A-Z0-9][A-Z0-9\-/]{3,20})", _
        "(?:n[" & Chr(176) & Chr(186) & "]?\s*de\s*p[o" & Chr(243) & "]liza)\s*[:#\-.]?\s*([A-Z0-9][A-Z0-9\-/]{3,20})")

    ' ── GRUPO 2: Fechas ────────────────────────────────────────

    c(4) = F(txt, "fecha", "Fecha del documento", _
        "fecha\s*(?:de\s*emisi[o" & Chr(243) & "]n)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
        "(?:date|issued?)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
        "(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})", _
        "^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})")

    c(5) = F(txt, "vencimiento", "Vencimiento", _
        "vencimiento\s*[:\-.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
        "(?:due\s*date|payment\s*due)\s*[:\-.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})")

    ' Fecha del siniestro/accidente/hecho
    c(6) = F(txt, "fecha_siniestro", "Fecha del siniestro/hecho", _
        "fecha\s*(?:del?\s*)?(?:siniestro|accidente|hecho|ocurrencia)\s*[:\-.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
        "(?:siniestro|accidente|hecho)\s+(?:ocurrido|del?\s*fecha)?\s*(?:el\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
        "(?:ocurri[o" & Chr(243) & "]|producido)\s+(?:el\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})")

    ' Periodo facturado / cubierto
    c(7) = F(txt, "periodo", "Periodo facturado / cubierto", _
        "per[i" & Chr(237) & "]odo\s*[:\-.]?\s*([^\r\n]{5,40})", _
        "(?:mes|cuota|ciclo)\s*(?:de\s*)?[:\-.]?\s*((?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s*\d{4})", _
        "desde\s*[:\-.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s*(?:hasta|al)\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})")

    ' ── GRUPO 3: Partes intervinientes ─────────────────────────

    c(8) = F(txt, "proveedor", "Proveedor / Emisor / Actor", _
        "(?:emisor|proveedor|vendedor|supplier|vendor)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "razon\s*social\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "(?:facturado\s*por|billed\s*by)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "(?:actor|actora|demandante)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "(?:poderdante|mandante|constituyente)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})")

    c(9) = F(txt, "cliente", "Cliente / Demandado / Receptor", _
        "(?:cliente|comprador|receptor|customer)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "(?:bill\s*to|sold\s*to|facturado\s*a)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "(?:demandado|demandada|accionado)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "(?:apoderado|mandatario)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})")

    ' Asegurado / Tomador del seguro
    c(10) = F(txt, "asegurado", "Asegurado / Tomador", _
        "(?:asegurado|tomador|beneficiario)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})", _
        "(?:a nombre de|en favor de)\s*[:\-.]\s*([A-Z][^\r\n]{3,70})")

    ' Letrado / Abogado (captura el nombre con Dr./Dra.)
    c(11) = F(txt, "letrado", "Letrado / Abogado", _
        "(?:Dr\.?|Dra\.?|letrado|abogad[oa]|patrocinante)\s*[:\-.]?\s*([A-Z][a-z" & Chr(225) & Chr(233) & Chr(237) & Chr(243) & Chr(250) & "]+(?:\s+[A-Z][a-z" & Chr(225) & Chr(233) & Chr(237) & Chr(243) & Chr(250) & "]+){1,4})", _
        "(?:estudio|bufete)\s*[:\-.]?\s*([A-Z][^\r\n]{3,60})")

    c(12) = F(txt, "cuit_rfc", "CUIT / CUIL / DNI", _
        "(?:CUIT|CUIL)\s*[:\-.]?\s*(\d{2}[\-\s]?\d{8}[\-\s]?\d{1})", _
        "DNI\s*[:\-.]?\s*(\d{7,8})", _
        "RFC\s*[:\-.]?\s*([A-Z]{3,4}\d{6}[A-Z0-9]{3})", _
        "(?:RUC|NIF|CIF)\s*[:\-.]?\s*([A-Z0-9][A-Z0-9\-]{7,19})")

    ' Matricula del letrado: "T° X F° X" o numero solo
    c(13) = F(txt, "matricula", "Matricula / Tomo y Folio", _
        "(?:mat[r" & Chr(237) & "]cula|T[" & Chr(176) & Chr(186) & "])\s*[:\-.]?\s*(T[" & Chr(176) & Chr(186) & "]?\s*\d+\s*[Ff][" & Chr(176) & Chr(186) & "]?\s*\d+)", _
        "(?:T[" & Chr(176) & Chr(186) & "]\.?\s*(\d+)\s*[Ff][" & Chr(176) & Chr(186) & "]\.?\s*\d+)", _
        "mat[r" & Chr(237) & "]cula\s*[:\-.]?\s*(\d{3,8})")

    ' ── GRUPO 4: Datos judiciales ──────────────────────────────

    ' Juzgado / Tribunal
    c(14) = F(txt, "juzgado", "Juzgado / Tribunal", _
        "(?:juzgado|tribunal|c[a" & Chr(225) & "]mara)\s*(?:[:\-.]|\ben\b)?\s*([^\r\n]{5,70})", _
        "ante\s*el\s*(?:juzgado|tribunal)\s*([^\r\n]{5,60})")

    ' Secretaria
    c(15) = F(txt, "secretaria", "Secretar" & Chr(237) & "a", _
        "secretar[i" & Chr(237) & "]a\s*(?:n[" & Chr(176) & Chr(186) & "]\.?)?\s*[:\-.]?\s*([^\r\n]{3,60})")

    ' Fuero
    c(16) = F(txt, "fuero", "Fuero", _
        "fuero\s*[:\-.]?\s*([^\r\n]{3,40})", _
        "\b(civil|laboral|comercial|penal|contencioso|familia)\b")

    ' Caratula / titulo de la causa
    c(17) = F(txt, "caratula", "Car" & Chr(225) & "tula / Autos", _
        "(?:car[a" & Chr(225) & "]tula|autos|caratulados?)\s*[:\-.]?\s*""?([^""\r\n]{5,100})", _
        "(?:car[a" & Chr(225) & "]tula|autos)\s*[:\-.]?\s*([A-Z][^\r\n]{5,100})")

    ' ── GRUPO 5: Datos comerciales / financieros ───────────────

    c(18) = F(txt, "condicion_pago", "Condicion de pago", _
        "condici[o" & Chr(243) & "]n\s*de\s*pago\s*[:\-.]\s*([^\r\n]{3,50})", _
        "forma\s*de\s*pago\s*[:\-.]\s*([^\r\n]{3,50})", _
        "payment\s*terms?\s*[:\-.]\s*([^\r\n]{3,50})")

    c(19) = F(txt, "moneda", "Moneda", _
        "\b(USD|ARS|EUR|MXN|CLP|COP|PEN|BRL|BOB|UYU|PYG)\b", _
        "(US\$|AR\$)")

    ' Tasa de interes
    c(20) = F(txt, "tasa_interes", "Tasa de inter" & Chr(233) & "s", _
        "tasa\s*(?:de\s*inter[e" & Chr(233) & "]s|de\s*referencia)?\s*[:\-.]?\s*([\d\.,]+\s*%\s*(?:anual|mensual|TNA|TEA)?)", _
        "inter[e" & Chr(233) & "]s\s*(?:anual|mensual|TNA|TEA)\s*[:\-.]?\s*([\d\.,]+\s*%?)", _
        "([\d\.,]+\s*%)\s*(?:anual|TNA|TEA|mensual)")

    ' ── GRUPO 6: Montos desagregados ───────────────────────────

    c(21) = F(txt, "subtotal", "Subtotal / Neto", _
        "subtotal\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "(?:base\s*imponible|neto)\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    c(22) = F(txt, "impuesto_iva", "IVA / Impuesto", _
        "IVA\s*(?:\(?(?:21|19|16|10|12|18)\s*%?\)?)?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "I\.?V\.?A\.?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "(?:IGV|VAT)\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    ' Capital reclamado / asegurado
    c(23) = F(txt, "capital", "Capital", _
        "capital\s*(?:reclamado|adeudado|asegurado|de\s*condena)?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "(?:monto|suma)\s*asegurad[oa]\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    c(24) = F(txt, "intereses", "Intereses", _
        "intereses?\s*(?:compensatorios?|moratorios?|punitorios?)?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "inter[e" & Chr(233) & "]s\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    c(25) = F(txt, "honorarios", "Honorarios", _
        "honorarios\s*(?:profesionales?|del?\s*(?:letrado|abogado|perito|regulados?))?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "\bhonorario\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    c(26) = F(txt, "costas", "Costas / Gastos procesales", _
        "costas\s*(?:y\s*costos?|procesales?)?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "gastos\s*(?:procesales?|judiciales?)?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "tasa\s*de\s*justicia\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    c(27) = F(txt, "danos", "Da" & Chr(241) & "os y Perjuicios", _
        "da[n" & Chr(241) & "]os?\s*(?:y\s*perjuicios?)?\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "lucro\s*cesante\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "da[n" & Chr(241) & "o]\s*(?:moral|material|emergente)\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    c(28) = F(txt, "multa", "Multa / Recargo", _
        "multa\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "recargo\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    ' ── GRUPO 7: Total ─────────────────────────────────────────

    ' Total: siempre al ultimo para no capturar subtotales primero
    c(29) = F(txt, "total", "TOTAL A PAGAR / RECLAMAR", _
        "total\s*a\s*pagar\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "total\s*(?:pagar|reclamado|general|facturado)\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "importe\s*total\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "gran\s*total\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "(?:monto|suma)\s*total\s*[:\.$]?\s*\$?\s*([\d\.,]+)", _
        "amount\s*due\s*[:\.$]?\s*\$?\s*([\d\.,]+)")

    ' Resumen de todos los montos etiquetados del documento
    c(30) = MontosTodos(txt)

    ExtraerCampos = c
End Function

' ==============================================================
' HELPERS DE EXTRACCION
' ==============================================================

' Busca el primer patron que hace match; acepta hasta 8 patrones.
Private Function F(txt As String, nom As String, etiq As String, _
                   p0 As String, _
                   Optional p1 As String = "", Optional p2 As String = "", _
                   Optional p3 As String = "", Optional p4 As String = "", _
                   Optional p5 As String = "", Optional p6 As String = "", _
                   Optional p7 As String = "") As CampoFactura
    RE
    Dim c As CampoFactura
    c.Nombre   = nom
    c.Etiqueta = etiq
    c.Valor    = "No encontrado"

    Dim pats(7) As String
    pats(0) = p0: pats(1) = p1: pats(2) = p2: pats(3) = p3
    pats(4) = p4: pats(5) = p5: pats(6) = p6: pats(7) = p7

    Dim i As Integer
    For i = 0 To 7
        If Len(pats(i)) = 0 Then Exit For
        m_re.Pattern = pats(i)
        Dim m As Object
        Set m = m_re.Execute(txt)
        If m.Count > 0 Then
            c.Valor = Trim(IIf(m(0).SubMatches.Count > 0, _
                               m(0).SubMatches(0), m(0).Value))
            If Len(c.Valor) > 0 Then Exit For
        End If
    Next i
    F = c
End Function

' Encuentra TODOS los montos con etiqueta en el documento.
Private Function MontosTodos(txt As String) As CampoFactura
    RE
    Dim c As CampoFactura
    c.Nombre   = "montos_todos"
    c.Etiqueta = "Todos los montos encontrados"
    c.Valor    = "No encontrado"

    ' Solo los primeros 8000 chars para no ralentizar en docs largos
    Dim muestra As String
    muestra = Left(txt, 8000)

    m_re.Global  = True
    m_re.Pattern = "([A-Za-z" & Chr(225) & Chr(233) & Chr(237) & Chr(243) & Chr(250) & Chr(241) & _
                   "]{3,}(?:\s[A-Za-z" & Chr(225) & Chr(233) & Chr(237) & Chr(243) & Chr(250) & Chr(241) & "]{2,}){0,3})" & _
                   "\s*[:\-\.$]?\s*\$\s*(\d[\d\.,]{2,15})"

    Dim mc As Object
    Set mc = m_re.Execute(muestra)
    m_re.Global = False

    If mc.Count = 0 Then
        MontosTodos = c
        Exit Function
    End If

    Dim skip As String
    skip = "|de|el|la|los|las|y|en|que|con|del|al|por|un|una|"

    Dim partes() As String
    ReDim partes(mc.Count - 1)
    Dim n As Integer

    Dim i As Integer
    For i = 0 To mc.Count - 1
        Dim etiq As String: etiq  = Trim(mc(i).SubMatches(0))
        Dim val  As String: val   = Trim(mc(i).SubMatches(1))
        If Len(etiq) >= 3 And InStr(skip, "|" & LCase(etiq) & "|") = 0 Then
            partes(n) = etiq & ": $" & val
            n = n + 1
        End If
    Next i

    If n > 0 Then
        ReDim Preserve partes(n - 1)
        c.Valor = Join(partes, "  /  ")
    End If
    MontosTodos = c
End Function

' ==============================================================
' NORMALIZACION DE TEXTO OCR
' ==============================================================

Public Function Limpiar(ByVal txt As String) As String
    RE
    m_re.Global = True

    ' Errores de OCR frecuentes
    m_re.Pattern = "Subtota[lt]\b":           txt = m_re.Replace(txt, "Subtotal")
    m_re.Pattern = "Tota[lt]\s+a\s+paga[rn]": txt = m_re.Replace(txt, "Total a pagar")
    m_re.Pattern = "Tota[lt]a?\s+paga[rn]":   txt = m_re.Replace(txt, "Total pagar")
    m_re.Pattern = "Vencimienta\b":            txt = m_re.Replace(txt, "Vencimiento")
    m_re.Pattern = "Facfura\b":                txt = m_re.Replace(txt, "Factura")
    m_re.Pattern = "C[Ll][Ll][TI][TI]\b":     txt = m_re.Replace(txt, "CUIT")
    m_re.Pattern = "I\.V\.A\.":               txt = m_re.Replace(txt, "IVA")
    m_re.Pattern = "Sin[il]estro\b":           txt = m_re.Replace(txt, "Siniestro")
    m_re.Pattern = "S1niestro\b":              txt = m_re.Replace(txt, "Siniestro")
    m_re.Pattern = "Exped[il]ente\b":          txt = m_re.Replace(txt, "Expediente")
    m_re.Pattern = "Expt[eo]\b":               txt = m_re.Replace(txt, "Expte")
    m_re.Pattern = "P[o0][il]iza\b":           txt = m_re.Replace(txt, "Poliza")
    m_re.Pattern = "Juzgad[o0]\b":             txt = m_re.Replace(txt, "Juzgado")

    ' Normalizar ">>" (puede aparecer como "> >" o ">>>")
    m_re.Pattern = ">\s*>+":                   txt = m_re.Replace(txt, ">>")

    ' Punto como dos puntos: "Cliente. Juan" → "Cliente: Juan"
    m_re.Pattern = "([A-Za-z]{3,})\.\s+([A-Z0-9\$])"
    txt = m_re.Replace(txt, "$1: $2")

    ' Espacio suelto en expediente: "36838 / 18" → "36838/18"
    m_re.Pattern = "(\d+)\s+\/\s*(\d{2,4})\b"
    txt = m_re.Replace(txt, "$1/$2")

    ' Eliminar caracteres de control
    m_re.Pattern = "[^\x09\x0A\x0D\x20-\xFF]"
    txt = m_re.Replace(txt, "")

    m_re.Global = False
    Limpiar = txt
End Function
