Attribute VB_Name = "modConfiguracion"
Option Explicit

' ==============================================================
' modConfiguracion  -  Hoja de configuracion de campos
'
' Permite al usuario elegir QUE campos extraer segun el tipo
' de documento: Factura, Siniestro, Demanda, Poder, o custom.
'
' La hoja "Configuracion" muestra una fila por campo con:
'   - Checkbox (control de formulario) enlazado a col C
'   - Nombre del campo (col D)
'   - Descripcion / tipo de documento (col E)
'
' Presets disponibles:
'   Solo Facturas | Solo Siniestros | Solo Demandas |
'   Poderes       | Todos           | Ninguno
' ==============================================================

Public Const HOJA_CONFIG As String = "Configuracion"

' Indice de la primera fila de datos en la hoja Config
Private Const FILA_DATOS As Integer = 8

' Total de campos definidos en modCampos (indices 0..N)
' Debe coincidir con UBound(campos) en ExtraerCampos
Private Const N_CAMPOS As Integer = 20

' ---------------------------------------------------------------
' Definicion de todos los campos: nombre interno, etiqueta y
' descripcion del tipo de documento en que aparece.
' El orden DEBE coincidir con el array en ExtraerCampos().
' ---------------------------------------------------------------
Private Sub ObtenerDefiniciones(nombres() As String, _
                                 etiquetas() As String, _
                                 descripciones() As String)
    ReDim nombres(N_CAMPOS - 1)
    ReDim etiquetas(N_CAMPOS - 1)
    ReDim descripciones(N_CAMPOS - 1)

    nombres(0)  = "numero_factura":    etiquetas(0)  = "Numero de factura":         descripciones(0)  = "Facturas / Comprobantes"
    nombres(1)  = "numero_siniestro":  etiquetas(1)  = "Siniestro N" & Chr(176):    descripciones(1)  = "Siniestros / Polizas / Seguros"
    nombres(2)  = "numero_expediente": etiquetas(2)  = "Expediente (Exp/Expte)":    descripciones(2)  = "Demandas / Poderes / Causas judiciales"
    nombres(3)  = "fecha":             etiquetas(3)  = "Fecha":                     descripciones(3)  = "Todos los documentos"
    nombres(4)  = "vencimiento":       etiquetas(4)  = "Vencimiento":               descripciones(4)  = "Facturas / Documentos comerciales"
    nombres(5)  = "proveedor":         etiquetas(5)  = "Proveedor / Emisor / Actor": descripciones(5)  = "Todos los documentos"
    nombres(6)  = "cliente":           etiquetas(6)  = "Cliente / Receptor / Demandado": descripciones(6)  = "Todos los documentos"
    nombres(7)  = "cuit_rfc":          etiquetas(7)  = "CUIT / CUIL / DNI":         descripciones(7)  = "Todos (identificacion fiscal)"
    nombres(8)  = "condicion_pago":    etiquetas(8)  = "Condicion de pago":         descripciones(8)  = "Facturas / Documentos comerciales"
    nombres(9)  = "moneda":            etiquetas(9)  = "Moneda":                    descripciones(9)  = "Documentos con importes"
    nombres(10) = "subtotal":          etiquetas(10) = "Subtotal / Neto":           descripciones(10) = "Facturas"
    nombres(11) = "impuesto_iva":      etiquetas(11) = "IVA / Impuesto":            descripciones(11) = "Facturas"
    nombres(12) = "capital":           etiquetas(12) = "Capital":                   descripciones(12) = "Demandas / Siniestros / Seguros"
    nombres(13) = "intereses":         etiquetas(13) = "Intereses":                 descripciones(13) = "Demandas / Liquidaciones"
    nombres(14) = "honorarios":        etiquetas(14) = "Honorarios":                descripciones(14) = "Demandas / Poderes / Liquidaciones"
    nombres(15) = "costas":            etiquetas(15) = "Costas / Gastos judiciales": descripciones(15) = "Demandas / Informes judiciales"
    nombres(16) = "danos":             etiquetas(16) = "Da" & Chr(241) & "os y Perjuicios": descripciones(16) = "Demandas / Siniestros"
    nombres(17) = "multa":             etiquetas(17) = "Multa / Recargo":            descripciones(17) = "Demandas / Infracciones"
    nombres(18) = "total":             etiquetas(18) = "TOTAL A PAGAR / RECLAMAR":  descripciones(18) = "Todos los documentos"
    nombres(19) = "montos_todos":      etiquetas(19) = "Resumen de todos los montos": descripciones(19) = "Documentos con multiples importes"
End Sub

' ---------------------------------------------------------------
' Crea (o recrea) la hoja de configuracion con checkboxes.
' ---------------------------------------------------------------
Public Sub ConfigurarHojaConfig()
    Dim ws As Worksheet

    ' Crear hoja si no existe
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(HOJA_CONFIG)
    On Error GoTo 0

    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = HOJA_CONFIG
    Else
        ' Limpiar checkboxes previos
        Dim cb As CheckBox
        For Each cb In ws.CheckBoxes
            cb.Delete
        Next
        ws.Cells.Clear
    End If

    Application.ScreenUpdating = False

    ' ── Anchos de columna ───────────────────────────────────────
    ws.Columns("A").ColumnWidth = 3
    ws.Columns("B").ColumnWidth = 6      ' checkbox
    ws.Columns("C").ColumnWidth = 3      ' valor enlazado (oculto)
    ws.Columns("D").ColumnWidth = 32     ' nombre del campo
    ws.Columns("E").ColumnWidth = 38     ' descripcion / tipo doc
    ws.Columns("F").ColumnWidth = 3

    ' ── Encabezado ──────────────────────────────────────────────
    ws.Rows(1).RowHeight = 36
    With ws.Range("B1:E1")
        .Merge
        .Value = Chr(9881) & "  CONFIGURACION DE CAMPOS A EXTRAER"
        .Font.Bold = True
        .Font.Size = 13
        .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(31, 73, 125)
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With

    ' ── Subtitulo ───────────────────────────────────────────────
    With ws.Range("B2:E2")
        .Merge
        .Value = "Activa los campos que queres extraer segun el tipo de documento."
        .Font.Italic = True
        .Font.Size = 9
        .Font.Color = RGB(80, 80, 80)
        .HorizontalAlignment = xlCenter
    End With

    ' ── Presets ─────────────────────────────────────────────────
    ws.Range("B4").Value = "Presets rapidos:"
    ws.Range("B4").Font.Bold = True

    AgregarBotonConfig ws, "C4", "Solo Facturas",    "PresetFactura",    RGB(68, 114, 196), 90
    AgregarBotonConfig ws, "D4", "Siniestros",       "PresetSiniestro",  RGB(255, 153, 0),  90
    AgregarBotonConfig ws, "E4", "Demandas/Poderes", "PresetDemanda",    RGB(112, 173, 71), 90
    AgregarBotonConfig ws, "C5", "Todos",            "PresetTodos",      RGB(31, 73, 125),  90
    AgregarBotonConfig ws, "D5", "Ninguno",          "PresetNinguno",    RGB(180, 60, 60),  90
    AgregarBotonConfig ws, "E5", "Volver al Lector", "VolverAlLector",   RGB(100, 100, 100), 90

    ' ── Encabezado tabla ────────────────────────────────────────
    ws.Rows(7).RowHeight = 18
    With ws.Range("B7:E7")
        .Interior.Color = RGB(200, 215, 235)
        .Font.Bold = True
        .Borders.LineStyle = xlContinuous
        .Borders.Color = RGB(150, 150, 180)
    End With
    ws.Range("B7").Value = Chr(10003)
    ws.Range("D7").Value = "Campo"
    ws.Range("E7").Value = "Tipo de documento"

    ' ── Ocultar columna C (valores enlazados) ───────────────────
    ws.Columns("C").Hidden = True

    ' ── Filas de campos ─────────────────────────────────────────
    Dim nombres()    As String
    Dim etiquetas()  As String
    Dim descripciones() As String
    ObtenerDefiniciones nombres, etiquetas, descripciones

    Dim i As Integer
    For i = 0 To N_CAMPOS - 1
        Dim fila As Integer
        fila = FILA_DATOS + i

        ws.Rows(fila).RowHeight = 18

        ' Celda enlazada (True/False) - oculta en col C
        ws.Cells(fila, 3).Value = True   ' por defecto todos activos

        ' Checkbox en col B
        Dim rngCB As Range
        Set rngCB = ws.Cells(fila, 2)
        Dim ck As CheckBox
        Set ck = ws.CheckBoxes.Add( _
            rngCB.Left + 4, _
            rngCB.Top + 2, _
            rngCB.Width - 6, _
            rngCB.Height - 2)
        ck.Caption    = ""
        ck.LinkedCell = ws.Cells(fila, 3).Address(False, False)
        ck.Value      = xlOn
        ck.Name       = "chk_" & nombres(i)

        ' Nombre del campo
        With ws.Cells(fila, 4)
            .Value = etiquetas(i)
            .Font.Bold = (i = 18)   ' TOTAL en negrita
        End With

        ' Descripcion
        ws.Cells(fila, 5).Value = descripciones(i)
        ws.Cells(fila, 5).Font.Color = RGB(100, 100, 100)
        ws.Cells(fila, 5).Font.Size = 9

        ' Color alternado
        Dim colorFila As Long
        If i Mod 2 = 0 Then colorFila = RGB(245, 249, 255) Else colorFila = RGB(255, 255, 255)
        ws.Range(ws.Cells(fila, 2), ws.Cells(fila, 5)).Interior.Color = colorFila
        ws.Range(ws.Cells(fila, 2), ws.Cells(fila, 5)).Borders.LineStyle = xlContinuous
        ws.Range(ws.Cells(fila, 2), ws.Cells(fila, 5)).Borders.Color = RGB(200, 200, 220)
    Next i

    ' Separador visual entre grupos
    MarcarSeparador ws, FILA_DATOS,      "IDENTIFICACION"
    MarcarSeparador ws, FILA_DATOS + 3,  "FECHAS"
    MarcarSeparador ws, FILA_DATOS + 5,  "PARTES INTERVINIENTES"
    MarcarSeparador ws, FILA_DATOS + 8,  "DATOS COMERCIALES"
    MarcarSeparador ws, FILA_DATOS + 10, "MONTOS DESAGREGADOS"
    MarcarSeparador ws, FILA_DATOS + 18, "RESUMEN"

    Application.ScreenUpdating = True
    ws.Range("D8").Select
End Sub

' ---------------------------------------------------------------
' Devuelve True si el campo con ese nombre interno esta activo.
' Si no existe la hoja config, devuelve True (incluir todo).
' ---------------------------------------------------------------
Public Function CampoEstaActivo(ByVal nombre As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(HOJA_CONFIG)
    On Error GoTo 0

    If ws Is Nothing Then
        CampoEstaActivo = True   ' sin config = todos activos
        Exit Function
    End If

    Dim nombres()    As String
    Dim etiquetas()  As String
    Dim descripciones() As String
    ObtenerDefiniciones nombres, etiquetas, descripciones

    Dim i As Integer
    For i = 0 To N_CAMPOS - 1
        If nombres(i) = nombre Then
            Dim val As Variant
            val = ws.Cells(FILA_DATOS + i, 3).Value
            CampoEstaActivo = CBool(val)
            Exit Function
        End If
    Next i

    CampoEstaActivo = True  ' campo no encontrado = incluir
End Function

' ---------------------------------------------------------------
' Activa una lista de campos por nombre y desactiva el resto.
' ---------------------------------------------------------------
Private Sub AplicarPreset(activos() As String)
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(HOJA_CONFIG)
    On Error GoTo 0
    If ws Is Nothing Then Exit Sub

    Dim nombres()    As String
    Dim etiquetas()  As String
    Dim descripciones() As String
    ObtenerDefiniciones nombres, etiquetas, descripciones

    Dim i As Integer
    For i = 0 To N_CAMPOS - 1
        Dim activo As Boolean
        activo = False
        Dim j As Integer
        For j = 0 To UBound(activos)
            If activos(j) = nombres(i) Then
                activo = True
                Exit For
            End If
        Next j
        ws.Cells(FILA_DATOS + i, 3).Value = activo
        ' Sincronizar checkbox
        On Error Resume Next
        ws.CheckBoxes("chk_" & nombres(i)).Value = IIf(activo, xlOn, xlOff)
        On Error GoTo 0
    Next i
End Sub

' ==============================================================
' PRESETS
' ==============================================================

Public Sub PresetFactura()
    AplicarPreset Array("numero_factura", "fecha", "vencimiento", "proveedor", _
                        "cliente", "cuit_rfc", "condicion_pago", "moneda", _
                        "subtotal", "impuesto_iva", "total")
End Sub

Public Sub PresetSiniestro()
    AplicarPreset Array("numero_siniestro", "numero_expediente", "fecha", _
                        "proveedor", "cliente", "cuit_rfc", _
                        "capital", "intereses", "honorarios", "costas", _
                        "total", "montos_todos")
End Sub

Public Sub PresetDemanda()
    AplicarPreset Array("numero_expediente", "numero_siniestro", "fecha", _
                        "proveedor", "cliente", "cuit_rfc", _
                        "capital", "intereses", "honorarios", "costas", _
                        "danos", "multa", "total", "montos_todos")
End Sub

Public Sub PresetTodos()
    Dim nombres()    As String
    Dim etiquetas()  As String
    Dim descripciones() As String
    ObtenerDefiniciones nombres, etiquetas, descripciones
    AplicarPreset nombres
End Sub

Public Sub PresetNinguno()
    AplicarPreset Array()
End Sub

Public Sub VolverAlLector()
    On Error Resume Next
    ThisWorkbook.Sheets(modPrincipal.HOJA_UI).Activate
    On Error GoTo 0
End Sub

' ==============================================================
' HELPERS DE PRESENTACION
' ==============================================================

Private Sub AgregarBotonConfig(ws As Worksheet, celda As String, _
                                texto As String, macro As String, _
                                color As Long, ancho As Integer)
    Dim rng As Range
    Set rng = ws.Range(celda)
    Dim btn As Button
    Set btn = ws.Buttons.Add(rng.Left + 1, rng.Top + 2, ancho, rng.Height - 3)
    With btn
        .Caption  = texto
        .OnAction = macro
        .Font.Size = 8
        .Font.Bold = True
    End With
End Sub

Private Sub MarcarSeparador(ws As Worksheet, fila As Integer, titulo As String)
    ' Inserta una fila separadora de grupo (solo visual, no desplaza datos)
    ' Como no podemos insertar filas facilmente, usamos el borde superior
    With ws.Range(ws.Cells(fila, 2), ws.Cells(fila, 5))
        .Borders(xlEdgeTop).LineStyle = xlDouble
        .Borders(xlEdgeTop).Color = RGB(31, 73, 125)
        .Borders(xlEdgeTop).Weight = xlMedium
    End With
    ' Mini etiqueta de grupo en col E usando comentario de celda
    On Error Resume Next
    ws.Cells(fila, 4).Comment.Delete
    ws.Cells(fila, 4).AddComment titulo
    ws.Cells(fila, 4).Comment.Visible = False
    On Error GoTo 0
End Sub
