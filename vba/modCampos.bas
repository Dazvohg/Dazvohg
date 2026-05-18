Attribute VB_Name = "modCampos"
Option Explicit

' ==============================================================
' modCampos  -  Extraccion de campos de factura mediante RegExp
'
' NOTA: usa VBScript.RegExp (nativo de Windows/Excel).
'       No soporta lookbehind; los patrones estan adaptados.
' ==============================================================

' Tipo publico que representa un campo extraido
Public Type CampoFactura
    Nombre   As String   ' clave interna
    Etiqueta As String   ' texto visible al usuario
    Valor    As String   ' valor extraido (o "No encontrado")
End Type

' ---------------------------------------------------------------
' Devuelve un array con todos los campos extraidos del texto.
' ---------------------------------------------------------------
Public Function ExtraerCampos(ByVal texto As String) As CampoFactura()
    texto = NormalizarTextoOCR(texto)

    Dim campos(11) As CampoFactura

    campos(0) = ExtCampo(texto, "numero_factura", "Numero de factura", _
        Array( _
            "[Nn][" & Chr(176) & Chr(186) & "\s]?\s*[Ff]actura\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "\bfactura\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "\binvoice\s*[:#\-\.]?\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "comprobante\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})", _
            "\bN[" & Chr(176) & Chr(186) & "\.]\s*([A-Z0-9][A-Z0-9\-/]{3,19})", _
            "\bfolio\s*[:#\-\.]\s*([A-Z0-9][A-Z0-9\-/]{2,19})"))

    campos(1) = ExtCampo(texto, "fecha", "Fecha de emision", _
        Array( _
            "fecha\s*(?:de\s*emis[io][o" & Chr(243) & "]n)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
            "(?:date|issued?)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
            "(\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})", _
            "^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})"))

    campos(2) = ExtCampo(texto, "vencimiento", "Vencimiento", _
        Array( _
            "vencimiento\s*[:\-\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})", _
            "(?:due\s*date|payment\s*due)\s*[:\-\.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})"))

    campos(3) = ExtCampo(texto, "proveedor", "Proveedor / Emisor", _
        Array( _
            "(?:emisor|proveedor|vendedor|supplier|vendor)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "razon\s*social\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:facturado\s*por|billed\s*by)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})"))

    campos(4) = ExtCampo(texto, "cliente", "Cliente / Receptor", _
        Array( _
            "(?:cliente|comprador|receptor|customer)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "(?:bill\s*to|sold\s*to)\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})", _
            "facturado\s*a\s*[:\-\.]\s*([A-Z][^\r\n]{3,70})"))

    campos(5) = ExtCampo(texto, "cuit_rfc", "CUIT / RFC / NIF", _
        Array( _
            "(?:CUIT|CUIL)\s*[:\.\-]?\s*(\d{2}[\-\s]?\d{8}[\-\s]?\d{1})", _
            "RFC\s*[:\.\-]?\s*([A-Z]{3,4}\d{6}[A-Z0-9]{3})", _
            "(?:RUC|NIF|CIF)\s*[:\.\-]?\s*([A-Z0-9][A-Z0-9\-]{7,19})", _
            "tax\s*id\s*[:\.\-]?\s*([A-Z0-9][A-Z0-9\-]{7,19})"))

    campos(6) = ExtCampo(texto, "numero_orden", "Orden de compra", _
        Array( _
            "orden\s*de\s*(?:compra|pedido)\s*[:#\-\.]\s*([A-Z0-9\-/]{3,20})", _
            "purchase\s*order\s*[:#\-\.]\s*([A-Z0-9\-/]{3,20})", _
            "\bP\.?O\.?\s*[:#\-\.]\s*([A-Z0-9\-/]{3,20})"))

    campos(7) = ExtCampo(texto, "condicion_pago", "Condicion de pago", _
        Array( _
            "condici[o" & Chr(243) & "]n\s*de\s*pago\s*[:\-\.]\s*([^\r\n]{3,50})", _
            "payment\s*terms?\s*[:\-\.]\s*([^\r\n]{3,50})", _
            "forma\s*de\s*pago\s*[:\-\.]\s*([^\r\n]{3,50})"))

    campos(8) = ExtCampo(texto, "moneda", "Moneda", _
        Array( _
            "\b(USD|ARS|EUR|MXN|CLP|COP|PEN|BRL|BOB|UYU|PYG)\b", _
            "(US\$|AR\$)"))

    campos(9) = ExtCampo(texto, "subtotal", "Subtotal", _
        Array( _
            "subtotal\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "(?:base\s*imponible|neto)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "(?:net\s*amount|amount\s*before\s*tax)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    campos(10) = ExtCampo(texto, "impuesto_iva", "IVA / Impuesto", _
        Array( _
            "IVA\s*(?:\(?(?:21|19|16|10|12|18)\s*%?\)?)?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "I\.?V\.?A\.?\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "(?:IGV|VAT|tax)\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    campos(11) = ExtCampo(texto, "total", "Total a pagar", _
        Array( _
            "total\s*a\s*pagar\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "total\s*pagar\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "importe\s*total\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "gran\s*total\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "amount\s*due\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "monto\s*total\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "total\s*general\s*[:\.\$]?\s*\$?\s*([\d\.,]+)", _
            "total\s*facturado\s*[:\.\$]?\s*\$?\s*([\d\.,]+)"))

    ExtraerCampos = campos
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
' Correcciones heuristicas de errores tipicos de OCR en espanol.
' VBScript.RegExp no soporta lookbehind; se usan grupos normales.
' ---------------------------------------------------------------
Public Function NormalizarTextoOCR(ByVal texto As String) As String
    Dim re As Object
    Set re = CreateObject("VBScript.RegExp")
    re.Global    = True
    re.IgnoreCase = True

    ' -- Errores de letras --
    re.Pattern = "Subtota[lt]\b": texto = re.Replace(texto, "Subtotal")
    re.Pattern = "Tota[lt]\s+a\s+paga[rn]": texto = re.Replace(texto, "Total a pagar")
    re.Pattern = "Tota[lt]a\s+paga[rn]": texto = re.Replace(texto, "Total a pagar")
    re.Pattern = "Tota[lt]\s+paga[rn]": texto = re.Replace(texto, "Total pagar")
    re.Pattern = "Vencimienta\b": texto = re.Replace(texto, "Vencimiento")
    re.Pattern = "Facfura\b": texto = re.Replace(texto, "Factura")
    re.Pattern = "C[Ll][Ll][TI][TI]\b": texto = re.Replace(texto, "CUIT")
    re.Pattern = "I\.V\.A\.": texto = re.Replace(texto, "IVA")
    re.Pattern = "IVA\s*(\d+)\s*%": texto = re.Replace(texto, "IVA $1%")

    ' -- Punto usado como dos puntos (patron: letra+punto+espacio+MAYUS/digito) --
    re.Pattern = "([A-Za-z]{3,})\.\s+([A-Z0-9\$])"
    texto = re.Replace(texto, "$1: $2")

    ' -- Eliminar caracteres de control excepto saltos de linea --
    re.Pattern = "[^\x09\x0A\x0D\x20-\xFF]"
    texto = re.Replace(texto, "")

    NormalizarTextoOCR = texto
End Function
