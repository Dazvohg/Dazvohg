Attribute VB_Name = "modConfiguracion"
Option Explicit

' ==============================================================
' modConfiguracion  -  Hoja visual de seleccion de campos
'
' Presets disponibles:
'   Facturas | Siniestros | Demandas/Poderes | Informes | Todos
' ==============================================================

Public Const HOJA_CONFIG As String = "Configuracion"
Private Const FILA_DATOS As Integer = 8
Private Const N_CAMPOS   As Integer = 31   ' debe coincidir con UBound(c)+1 en modCampos

' ── Definicion de todos los campos ──────────────────────────────
' Orden: igual al array c() en modCampos.ExtraerCampos
Private Sub Defs(n() As String, e() As String, d() As String)
    ReDim n(N_CAMPOS - 1): ReDim e(N_CAMPOS - 1): ReDim d(N_CAMPOS - 1)

    n(0)  = "numero_factura":   e(0)  = "N" & Chr(176) & " Factura / Comprobante":     d(0)  = "Facturas / Recibos"
    n(1)  = "numero_siniestro": e(1)  = "Siniestro N" & Chr(176):                      d(1)  = "Siniestros / Seguros"
    n(2)  = "numero_expediente":e(2)  = "Expediente (Exp/Expte/Causa)":                d(2)  = "Demandas / Poderes"
    n(3)  = "numero_poliza":    e(3)  = "N" & Chr(176) & " Poliza":                    d(3)  = "Seguros / Polizas"
    n(4)  = "fecha":            e(4)  = "Fecha del documento":                          d(4)  = "Todos"
    n(5)  = "vencimiento":      e(5)  = "Vencimiento":                                  d(5)  = "Facturas / Comerciales"
    n(6)  = "fecha_siniestro":  e(6)  = "Fecha del siniestro/hecho":                   d(6)  = "Siniestros / Demandas"
    n(7)  = "periodo":          e(7)  = "Periodo facturado/cubierto":                   d(7)  = "Facturas / Seguros"
    n(8)  = "proveedor":        e(8)  = "Proveedor / Emisor / Actor":                   d(8)  = "Todos"
    n(9)  = "cliente":          e(9)  = "Cliente / Demandado / Receptor":               d(9)  = "Todos"
    n(10) = "asegurado":        e(10) = "Asegurado / Tomador":                          d(10) = "Seguros / Polizas"
    n(11) = "letrado":          e(11) = "Letrado / Abogado":                            d(11) = "Demandas / Poderes"
    n(12) = "cuit_rfc":         e(12) = "CUIT / CUIL / DNI":                           d(12) = "Todos (identificacion)"
    n(13) = "matricula":        e(13) = "Matricula / Tomo y Folio":                     d(13) = "Demandas / Poderes"
    n(14) = "juzgado":          e(14) = "Juzgado / Tribunal":                           d(14) = "Demandas / Poderes"
    n(15) = "secretaria":       e(15) = "Secretar" & Chr(237) & "a":                   d(15) = "Demandas / Informes"
    n(16) = "fuero":            e(16) = "Fuero":                                         d(16) = "Demandas"
    n(17) = "caratula":         e(17) = "Car" & Chr(225) & "tula / Autos":             d(17) = "Demandas / Poderes"
    n(18) = "condicion_pago":   e(18) = "Condicion de pago":                            d(18) = "Facturas / Comerciales"
    n(19) = "moneda":           e(19) = "Moneda":                                        d(19) = "Docs con importes"
    n(20) = "tasa_interes":     e(20) = "Tasa de interes":                              d(20) = "Demandas / Liquidaciones"
    n(21) = "subtotal":         e(21) = "Subtotal / Neto":                              d(21) = "Facturas"
    n(22) = "impuesto_iva":     e(22) = "IVA / Impuesto":                              d(22) = "Facturas"
    n(23) = "capital":          e(23) = "Capital":                                       d(23) = "Demandas / Siniestros"
    n(24) = "intereses":        e(24) = "Intereses":                                     d(24) = "Demandas / Liquidaciones"
    n(25) = "honorarios":       e(25) = "Honorarios":                                   d(25) = "Demandas / Poderes"
    n(26) = "costas":           e(26) = "Costas / Gastos procesales":                   d(26) = "Demandas / Informes"
    n(27) = "danos":            e(27) = "Da" & Chr(241) & "os y Perjuicios":           d(27) = "Demandas / Siniestros"
    n(28) = "multa":            e(28) = "Multa / Recargo":                              d(28) = "Demandas / Infracciones"
    n(29) = "total":            e(29) = "TOTAL A PAGAR / RECLAMAR":                    d(29) = "Todos"
    n(30) = "montos_todos":     e(30) = "Todos los montos encontrados":                 d(30) = "Docs con multiples importes"
End Sub

' ---------------------------------------------------------------
' Crea (o regenera) la hoja de configuracion.
' ---------------------------------------------------------------
Public Sub ConfigurarHojaConfig()
    Dim ws As Worksheet
    On Error Resume Next: Set ws = ThisWorkbook.Sheets(HOJA_CONFIG): On Error GoTo 0

    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = HOJA_CONFIG
    Else
        Dim cb As CheckBox
        For Each cb In ws.CheckBoxes: cb.Delete: Next
        ws.Cells.Clear
    End If

    Application.ScreenUpdating = False

    ws.Columns("A").ColumnWidth = 2
    ws.Columns("B").ColumnWidth = 5
    ws.Columns("C").ColumnWidth = 3   ' valores enlazados (se oculta)
    ws.Columns("D").ColumnWidth = 34
    ws.Columns("E").ColumnWidth = 32

    ' Encabezado
    ws.Rows(1).RowHeight = 34
    With ws.Range("B1:E1")
        .Merge: .Value = Chr(9881) & "  CONFIGURAR CAMPOS A EXTRAER"
        .Font.Bold = True: .Font.Size = 13: .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(31, 73, 125)
        .HorizontalAlignment = xlCenter: .VerticalAlignment = xlCenter
    End With

    With ws.Range("B2:E2")
        .Merge: .Value = "Marca los campos que queres ver en el resultado segun el tipo de documento."
        .Font.Italic = True: .Font.Size = 9: .Font.Color = RGB(80, 80, 80)
        .HorizontalAlignment = xlCenter
    End With

    ' Presets - fila 4
    ws.Range("B4").Value = "Presets:"
    ws.Range("B4").Font.Bold = True
    Btn ws, "C4", "Facturas",        "PresetFactura",    RGB(68, 114, 196)
    Btn ws, "D4", "Siniestros",      "PresetSiniestro",  RGB(255, 153, 0)
    Btn ws, "E4", "Demandas/Poderes","PresetDemanda",     RGB(112, 173, 71)

    ' Presets - fila 5
    Btn ws, "C5", "Informes",        "PresetInforme",    RGB(150, 100, 200)
    Btn ws, "D5", "Todos",           "PresetTodos",      RGB(31, 73, 125)
    Btn ws, "E5", "Ninguno",         "PresetNinguno",    RGB(180, 60, 60)

    ' Boton volver - fila 6
    Btn ws, "C6", "Volver al Lector","VolverAlLector",   RGB(100, 100, 100)

    ' Encabezado tabla - fila 7
    ws.Rows(7).RowHeight = 17
    With ws.Range("B7:E7")
        .Interior.Color = RGB(190, 210, 240): .Font.Bold = True
        .Borders.LineStyle = xlContinuous: .Borders.Color = RGB(130, 160, 200)
    End With
    ws.Range("B7").Value = Chr(10003): ws.Range("D7").Value = "Campo"
    ws.Range("E7").Value = "Tipo de documento"

    ws.Columns("C").Hidden = True   ' ocultar columna de valores

    ' Definiciones
    Dim n() As String, e() As String, d() As String
    Defs n, e, d

    ' Filas de campos
    Dim i As Integer, fila As Integer
    For i = 0 To N_CAMPOS - 1
        fila = FILA_DATOS + i
        ws.Rows(fila).RowHeight = 17
        ws.Cells(fila, 3).Value = True     ' activo por defecto

        ' Checkbox enlazado a col C
        Dim rC As Range: Set rC = ws.Cells(fila, 2)
        Dim ck As CheckBox
        Set ck = ws.CheckBoxes.Add(rC.Left + 3, rC.Top + 2, rC.Width - 5, rC.Height - 3)
        ck.Caption = "": ck.LinkedCell = ws.Cells(fila, 3).Address(False, False)
        ck.Value = xlOn: ck.Name = "chk_" & n(i)

        ws.Cells(fila, 4).Value = e(i)
        If n(i) = "total" Then ws.Cells(fila, 4).Font.Bold = True

        ws.Cells(fila, 5).Value = d(i)
        ws.Cells(fila, 5).Font.Color = RGB(100, 100, 100)
        ws.Cells(fila, 5).Font.Size = 9

        Dim clr As Long
        clr = IIf(i Mod 2 = 0, RGB(245, 249, 255), RGB(255, 255, 255))
        With ws.Range(ws.Cells(fila, 2), ws.Cells(fila, 5))
            .Interior.Color = clr
            .Borders.LineStyle = xlContinuous
            .Borders.Color = RGB(200, 210, 225)
        End With
    Next i

    ' Separadores de grupo (borde superior grueso)
    Sep ws, FILA_DATOS       ' Identificacion
    Sep ws, FILA_DATOS + 4   ' Fechas
    Sep ws, FILA_DATOS + 8   ' Partes
    Sep ws, FILA_DATOS + 14  ' Judicial
    Sep ws, FILA_DATOS + 18  ' Comercial/Financiero
    Sep ws, FILA_DATOS + 21  ' Montos
    Sep ws, FILA_DATOS + 29  ' Total

    Application.ScreenUpdating = True
    ws.Range("D8").Select
End Sub

' ---------------------------------------------------------------
' Devuelve True si el campo esta activo en la config.
' Si no hay hoja config → True (incluir todo).
' ---------------------------------------------------------------
Public Function CampoEstaActivo(ByVal nombre As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next: Set ws = ThisWorkbook.Sheets(HOJA_CONFIG): On Error GoTo 0
    If ws Is Nothing Then CampoEstaActivo = True: Exit Function

    Dim n() As String, e() As String, d() As String
    Defs n, e, d

    Dim i As Integer
    For i = 0 To N_CAMPOS - 1
        If n(i) = nombre Then
            CampoEstaActivo = CBool(ws.Cells(FILA_DATOS + i, 3).Value)
            Exit Function
        End If
    Next i
    CampoEstaActivo = True
End Function

' ==============================================================
' PRESETS
' ==============================================================

Private Sub Aplicar(activos() As String)
    Dim ws As Worksheet
    On Error Resume Next: Set ws = ThisWorkbook.Sheets(HOJA_CONFIG): On Error GoTo 0
    If ws Is Nothing Then Exit Sub

    Dim n() As String, e() As String, d() As String
    Defs n, e, d

    Dim i As Integer
    For i = 0 To N_CAMPOS - 1
        Dim ok As Boolean: ok = False
        Dim j As Integer
        For j = 0 To UBound(activos)
            If activos(j) = n(i) Then ok = True: Exit For
        Next j
        ws.Cells(FILA_DATOS + i, 3).Value = ok
        On Error Resume Next
        ws.CheckBoxes("chk_" & n(i)).Value = IIf(ok, xlOn, xlOff)
        On Error GoTo 0
    Next i
End Sub

Public Sub PresetFactura()
    Aplicar Array("numero_factura", "fecha", "vencimiento", "periodo", _
                  "proveedor", "cliente", "cuit_rfc", "condicion_pago", _
                  "moneda", "subtotal", "impuesto_iva", "total")
End Sub

Public Sub PresetSiniestro()
    Aplicar Array("numero_siniestro", "numero_poliza", "numero_expediente", _
                  "fecha", "fecha_siniestro", "proveedor", "cliente", "asegurado", _
                  "cuit_rfc", "capital", "intereses", "honorarios", _
                  "total", "montos_todos")
End Sub

Public Sub PresetDemanda()
    Aplicar Array("numero_expediente", "numero_siniestro", "caratula", _
                  "fecha", "fecha_siniestro", "proveedor", "cliente", "cuit_rfc", _
                  "letrado", "matricula", "juzgado", "secretaria", "fuero", _
                  "capital", "intereses", "tasa_interes", "honorarios", _
                  "costas", "danos", "multa", "total", "montos_todos")
End Sub

Public Sub PresetInforme()
    Aplicar Array("numero_expediente", "numero_siniestro", "fecha", _
                  "proveedor", "cliente", "cuit_rfc", "juzgado", "secretaria", _
                  "letrado", "capital", "intereses", "honorarios", _
                  "total", "montos_todos")
End Sub

Public Sub PresetTodos()
    Dim n() As String, e() As String, d() As String
    Defs n, e, d: Aplicar n
End Sub

Public Sub PresetNinguno():  Aplicar Array(): End Sub

Public Sub VolverAlLector()
    On Error Resume Next
    ThisWorkbook.Sheets(modPrincipal.HOJA_UI).Activate
    On Error GoTo 0
End Sub

' ==============================================================
' HELPERS
' ==============================================================

Private Sub Btn(ws As Worksheet, cel As String, txt As String, mac As String, clr As Long)
    Dim r As Range: Set r = ws.Range(cel)
    Dim b As Button
    Set b = ws.Buttons.Add(r.Left + 1, r.Top + 2, r.Width - 2, r.Height - 3)
    b.Caption = txt: b.OnAction = mac: b.Font.Size = 8: b.Font.Bold = True
End Sub

Private Sub Sep(ws As Worksheet, fila As Integer)
    With ws.Range(ws.Cells(fila, 2), ws.Cells(fila, 5)).Borders(xlEdgeTop)
        .LineStyle = xlDouble: .Color = RGB(31, 73, 125): .Weight = xlMedium
    End With
End Sub
