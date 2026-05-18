Attribute VB_Name = "modPrincipal"
Option Explicit

' ==============================================================
' modPrincipal  -  Orquestacion, interfaz y botones
'
' La hoja "Lector de Facturas" se crea y configura
' automaticamente al abrir el libro (ver ThisWorkbook.cls).
'
' Botones disponibles:
'   Examinar        → SeleccionarArchivo()
'   Extraer Datos   → ExtraerDatos()
'   Procesar Varios → ProcesarLote()
'   Exportar CSV    → ExportarCSV()
'   Ver Texto OCR   → VerTextoExtraido()
'   Limpiar         → LimpiarResultados()
' ==============================================================

Public Const HOJA_UI As String    = "Lector de Facturas"
Public Const HOJA_LOTE As String  = "Lote"
Public Const NOMBRE_RUTA As String = "RutaPDF"
Public Const NOMBRE_OCR  As String = "ForzarOCR"

' Texto extraido en la ultima ejecucion (para "Ver Texto OCR")
Private sTextoUltimo  As String
Private sMetodoUltimo As String

' ---------------------------------------------------------------
' Configura la hoja de interfaz. Se llama desde Workbook_Open.
' ---------------------------------------------------------------
Public Sub ConfigurarHoja()
    Dim ws As Worksheet

    ' Crear hoja si no existe
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(HOJA_UI)
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = HOJA_UI
    End If

    With ws
        .Cells.Clear
        Application.ScreenUpdating = False

        ' --- Anchos de columna ---
        .Columns("A").ColumnWidth = 2
        .Columns("B").ColumnWidth = 30
        .Columns("C").ColumnWidth = 42
        .Columns("D").ColumnWidth = 20
        .Columns("E").ColumnWidth = 2
        .Rows(1).RowHeight = 42

        ' ======================================================
        ' ENCABEZADO
        ' ======================================================
        With .Range("B1:D1")
            .Merge
            .Value = Chr(128196) & "  LECTOR DE FACTURAS PDF"
            .Font.Bold = True
            .Font.Size = 15
            .Font.Color = RGB(255, 255, 255)
            .Interior.Color = RGB(31, 73, 125)
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
        End With

        ' ======================================================
        ' SECCION: ARCHIVO
        ' ======================================================
        With .Range("B3")
            .Value = "Archivo PDF:"
            .Font.Bold = True
            .Font.Size = 11
        End With

        With .Range("C3")
            .Interior.Color = RGB(242, 242, 242)
            .Borders(xlEdgeBottom).LineStyle = xlContinuous
            .Borders(xlEdgeBottom).Color = RGB(100, 100, 100)
            .Name = NOMBRE_RUTA
            .Font.Italic = True
        End With

        ' ======================================================
        ' SECCION: OPCIONES
        ' ======================================================
        With .Range("B5")
            .Value = "Forzar OCR:"
            .Font.Bold = True
        End With
        With .Range("C5")
            .Value = False
            .Name = NOMBRE_OCR
            .HorizontalAlignment = xlLeft
        End With
        .Range("D5").Value = "(activar si el PDF es una imagen escaneada)"
        .Range("D5").Font.Italic = True
        .Range("D5").Font.Color = RGB(100, 100, 100)
        .Range("D5").Font.Size = 9

        ' ======================================================
        ' BOTONES - fila 3
        ' ======================================================
        AgregarBoton ws, "D3", "Examinar...", "SeleccionarArchivo", RGB(68, 114, 196)

        ' BOTONES - fila 7
        AgregarBoton ws, "B7", "Extraer Datos",   "ExtraerDatos",       RGB(68, 114, 196)
        AgregarBoton ws, "C7", "Procesar Varios",  "ProcesarLote",       RGB(112, 173, 71)
        AgregarBoton ws, "D7", "Exportar CSV",     "ExportarCSV",        RGB(255, 153, 0)

        ' BOTONES - fila 8
        AgregarBoton ws, "B8", "Ver Texto Extraido", "VerTextoExtraido", RGB(150, 100, 200)
        AgregarBoton ws, "C8", "Limpiar",            "LimpiarResultados", RGB(180, 60, 60)

        ' ======================================================
        ' TABLA DE RESULTADOS - encabezados
        ' ======================================================
        .Rows(10).RowHeight = 20
        With .Range("B10")
            .Value = "Campo"
            .Font.Bold = True
            .Font.Color = RGB(255, 255, 255)
            .Interior.Color = RGB(31, 73, 125)
            .HorizontalAlignment = xlCenter
        End With
        With .Range("C10")
            .Value = "Valor extraido"
            .Font.Bold = True
            .Font.Color = RGB(255, 255, 255)
            .Interior.Color = RGB(31, 73, 125)
            .HorizontalAlignment = xlCenter
        End With
        With .Range("D10")
            .Value = "Estado"
            .Font.Bold = True
            .Font.Color = RGB(255, 255, 255)
            .Interior.Color = RGB(31, 73, 125)
            .HorizontalAlignment = xlCenter
        End With
        .Range("B10:D10").Borders.LineStyle = xlContinuous

        ' ======================================================
        ' FILA DE INFORMACION (metodo, conteo)
        ' ======================================================
        With .Range("B24:D24")
            .Merge
            .Font.Italic = True
            .Font.Size = 9
            .Font.Color = RGB(120, 120, 120)
            .Name = "InfoMetodo"
        End With

    End With

    Application.ScreenUpdating = True
    ws.Activate
    ws.Range("C3").Select
End Sub

' ---------------------------------------------------------------
' Abre el dialogo de seleccion de archivo PDF
' ---------------------------------------------------------------
Public Sub SeleccionarArchivo()
    Dim ruta As Variant
    ruta = Application.GetOpenFilename( _
        FileFilter:="Archivos PDF (*.pdf), *.pdf", _
        Title:="Seleccionar factura PDF")
    If ruta <> False Then
        HojaUI.Range(NOMBRE_RUTA).Value = CStr(ruta)
        HojaUI.Range(NOMBRE_RUTA).Font.Italic = False
    End If
End Sub

' ---------------------------------------------------------------
' Boton principal: extrae datos de la factura seleccionada
' ---------------------------------------------------------------
Public Sub ExtraerDatos()
    Dim rutaPDF As String
    rutaPDF = Trim(HojaUI.Range(NOMBRE_RUTA).Value)

    If Len(rutaPDF) = 0 Then
        MsgBox "Selecciona un archivo PDF primero.", vbExclamation, "Lector de Facturas"
        Exit Sub
    End If
    If Not ArchivoExiste(rutaPDF) Then
        MsgBox "No se encontro el archivo:" & vbNewLine & rutaPDF, vbCritical, "Error"
        Exit Sub
    End If

    Dim forzarOCR As Boolean
    forzarOCR = CBool(HojaUI.Range(NOMBRE_OCR).Value)

    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    Application.Cursor = xlWait

    Dim metodo As String
    Dim texto  As String
    texto = ExtraerTextoPDF(rutaPDF, metodo, forzarOCR)

    If Len(Trim(texto)) = 0 Then
        Application.ScreenUpdating = True
        Application.Calculation = xlCalculationAutomatic
        Application.Cursor = xlDefault
        LimpiarEstado
        MsgBox "No se pudo extraer texto del PDF." & vbNewLine & _
               "El archivo puede estar protegido o danado.", vbCritical, "Error"
        Exit Sub
    End If

    sTextoUltimo  = texto
    sMetodoUltimo = metodo

    Estado "Analizando y extrayendo campos..."
    Dim campos() As CampoFactura
    campos = ExtraerCampos(texto)

    MostrarResultados HojaUI, campos, metodo, rutaPDF

    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    Application.Cursor = xlDefault
    Estado "Listo.  Metodo: " & metodo & "  |  " & _
           ContarEncontrados(campos) & "/" & (UBound(campos) + 1) & " campos encontrados"
End Sub

' ---------------------------------------------------------------
' Procesa un lote de PDFs (los de la hoja "Lote")
' ---------------------------------------------------------------
Public Sub ProcesarLote()
    ' Crear hoja de lote si no existe
    Dim wsLote As Worksheet
    On Error Resume Next
    Set wsLote = ThisWorkbook.Sheets(HOJA_LOTE)
    On Error GoTo 0

    If wsLote Is Nothing Then
        Set wsLote = ThisWorkbook.Sheets.Add(After:=HojaUI)
        wsLote.Name = HOJA_LOTE
        ConfigurarHojaLote wsLote
        MsgBox "Se creo la hoja '" & HOJA_LOTE & "'." & vbNewLine & _
               "Pega las rutas de los PDFs en la columna A (fila 2 en adelante) y vuelve a presionar 'Procesar Varios'.", _
               vbInformation, "Lote"
        wsLote.Activate
        Exit Sub
    End If

    Dim forzarOCR As Boolean
    forzarOCR = CBool(HojaUI.Range(NOMBRE_OCR).Value)

    Application.ScreenUpdating = False
    Application.Cursor = xlWait

    ' Leer rutas desde columna A (fila 2 en adelante)
    Dim fila As Long
    fila = 2
    Dim procesados As Integer

    Do While Len(Trim(CStr(wsLote.Cells(fila, 1).Value))) > 0
        Dim ruta As String
        ruta = Trim(CStr(wsLote.Cells(fila, 1).Value))

        If ArchivoExiste(ruta) Then
            Estado "Lote: procesando " & Dir(ruta) & " (" & fila - 1 & ")..."
            Dim metodo As String
            Dim texto  As String
            texto = ExtraerTextoPDF(ruta, metodo, forzarOCR)

            Dim campos() As CampoFactura
            If Len(Trim(texto)) > 0 Then
                campos = ExtraerCampos(texto)
                EscribirFilaLote wsLote, fila, campos, metodo, Dir(ruta)
            Else
                wsLote.Cells(fila, 2).Value = "ERROR - no se pudo extraer texto"
                wsLote.Cells(fila, 2).Font.Color = RGB(200, 0, 0)
            End If
            procesados = procesados + 1
        Else
            wsLote.Cells(fila, 2).Value = "ERROR - archivo no encontrado"
            wsLote.Cells(fila, 2).Font.Color = RGB(200, 0, 0)
        End If

        fila = fila + 1
    Loop

    Application.ScreenUpdating = True
    Application.Cursor = xlDefault
    LimpiarEstado
    MsgBox "Lote completado: " & procesados & " archivo(s) procesado(s).", _
           vbInformation, "Lote"
    wsLote.Activate
End Sub

' ---------------------------------------------------------------
' Exporta los resultados actuales a un archivo CSV
' ---------------------------------------------------------------
Public Sub ExportarCSV()
    If Len(sTextoUltimo) = 0 Then
        MsgBox "Primero extrae los datos de una factura.", vbExclamation
        Exit Sub
    End If

    Dim rutaCSV As Variant
    rutaCSV = Application.GetSaveAsFilename( _
        InitialFileName:="factura_extraida", _
        FileFilter:="CSV (*.csv), *.csv", _
        Title:="Guardar resultado como CSV")

    If rutaCSV = False Then Exit Sub

    Dim campos() As CampoFactura
    campos = ExtraerCampos(sTextoUltimo)

    Dim lineas As String
    lineas = "Campo,Etiqueta,Valor,Metodo" & vbNewLine
    Dim i As Integer
    For i = 0 To UBound(campos)
        lineas = lineas & _
                 """" & campos(i).Nombre   & """," & _
                 """" & campos(i).Etiqueta & """," & _
                 """" & campos(i).Valor    & """," & _
                 """" & sMetodoUltimo      & """" & vbNewLine
    Next i

    EscribirArchivo CStr(rutaCSV), lineas
    MsgBox "Exportado correctamente: " & CStr(rutaCSV), vbInformation
End Sub

' ---------------------------------------------------------------
' Muestra el texto crudo extraido en una ventana de texto
' ---------------------------------------------------------------
Public Sub VerTextoExtraido()
    If Len(sTextoUltimo) = 0 Then
        MsgBox "No hay texto extraido aun. Procesa una factura primero.", vbExclamation
        Exit Sub
    End If

    Dim wsTexto As Worksheet
    On Error Resume Next
    Set wsTexto = ThisWorkbook.Sheets("Texto Extraido")
    On Error GoTo 0

    If wsTexto Is Nothing Then
        Set wsTexto = ThisWorkbook.Sheets.Add(After:=HojaUI)
        wsTexto.Name = "Texto Extraido"
    End If

    wsTexto.Cells.Clear
    With wsTexto.Range("A1")
        .Value = "TEXTO EXTRAIDO (metodo: " & sMetodoUltimo & ")"
        .Font.Bold = True
    End With

    Dim lineas() As String
    lineas = Split(sTextoUltimo, vbNewLine)
    Dim i As Integer
    For i = 0 To UBound(lineas)
        wsTexto.Cells(i + 2, 1).Value = lineas(i)
    Next i

    wsTexto.Columns("A").AutoFit
    wsTexto.Activate
End Sub

' ---------------------------------------------------------------
' Limpia los resultados de la hoja principal
' ---------------------------------------------------------------
Public Sub LimpiarResultados()
    With HojaUI
        .Range("B11:D23").ClearContents
        .Range("B11:D23").ClearFormats
        On Error Resume Next
        .Range("InfoMetodo").Value = ""
        .Range(NOMBRE_RUTA).Value = ""
        .Range(NOMBRE_RUTA).Font.Italic = True
        On Error GoTo 0
    End With

    sTextoUltimo  = ""
    sMetodoUltimo = ""
    LimpiarEstado
End Sub

' ==============================================================
' FUNCIONES PRIVADAS DE PRESENTACION
' ==============================================================

Private Sub MostrarResultados(ws As Worksheet, campos() As CampoFactura, _
                               metodo As String, rutaPDF As String)
    Dim FILA_INICIO As Integer: FILA_INICIO = 11
    Dim COLOR_PAR   As Long:    COLOR_PAR   = RGB(240, 245, 255)
    Dim COLOR_IMPAR As Long:    COLOR_IMPAR = RGB(255, 255, 255)

    ' Limpiar resultados anteriores
    ws.Range("B" & FILA_INICIO & ":D" & (FILA_INICIO + 13)).ClearContents
    ws.Range("B" & FILA_INICIO & ":D" & (FILA_INICIO + 13)).ClearFormats

    Dim i As Integer
    For i = 0 To UBound(campos)
        Dim fila As Integer: fila = FILA_INICIO + i
        Dim rng As Range:    Set rng = ws.Range("B" & fila & ":D" & fila)

        ' Etiqueta
        With ws.Cells(fila, 2)
            .Value = campos(i).Etiqueta
            .Font.Bold = True
        End With

        ' Valor
        ws.Cells(fila, 3).Value = campos(i).Valor

        ' Estado
        With ws.Cells(fila, 4)
            If campos(i).Valor <> "No encontrado" Then
                .Value = Chr(10003) & " OK"
                .Font.Color = RGB(0, 130, 0)
                ws.Cells(fila, 3).Font.Color = RGB(0, 0, 0)
            Else
                .Value = Chr(10007) & " ---"
                .Font.Color = RGB(180, 0, 0)
                ws.Cells(fila, 3).Font.Color = RGB(160, 160, 160)
                ws.Cells(fila, 3).Font.Italic = True
            End If
            .HorizontalAlignment = xlCenter
        End With

        ' Color de fila alternado
        If i Mod 2 = 0 Then
            rng.Interior.Color = COLOR_PAR
        Else
            rng.Interior.Color = COLOR_IMPAR
        End If
        rng.Borders.LineStyle = xlContinuous
        rng.Borders.Color = RGB(180, 180, 180)
        ws.Rows(fila).RowHeight = 18
    Next i

    ' Resumen en la fila de informacion
    Dim encontrados As Integer
    encontrados = ContarEncontrados(campos)
    On Error Resume Next
    ws.Range("InfoMetodo").Value = "Metodo: " & metodo & _
        "  |  Campos: " & encontrados & " / " & (UBound(campos) + 1) & _
        "  |  Archivo: " & Dir(rutaPDF)
    On Error GoTo 0
End Sub

Private Sub EscribirFilaLote(ws As Worksheet, fila As Long, _
                              campos() As CampoFactura, metodo As String, _
                              nombreArchivo As String)
    ' Escribir encabezados en la fila 1 si estan vacios
    If ws.Cells(1, 2).Value = "" Then
        ws.Cells(1, 1).Value = "Archivo"
        Dim j As Integer
        For j = 0 To UBound(campos)
            ws.Cells(1, j + 2).Value = campos(j).Etiqueta
        Next j
        ws.Cells(1, UBound(campos) + 3).Value = "Metodo"
        ws.Rows(1).Font.Bold = True
    End If

    ' Nombre del archivo ya esta en col A
    Dim i As Integer
    For i = 0 To UBound(campos)
        ws.Cells(fila, i + 2).Value = campos(i).Valor
    Next i
    ws.Cells(fila, UBound(campos) + 3).Value = metodo
End Sub

Private Sub ConfigurarHojaLote(ws As Worksheet)
    ws.Cells(1, 1).Value = "Ruta completa del PDF (pegar aqui)"
    ws.Cells(1, 1).Font.Bold = True
    ws.Columns("A").ColumnWidth = 60
    ws.Cells(2, 1).Select
End Sub

Private Sub AgregarBoton(ws As Worksheet, celda As String, _
                          texto As String, macro As String, color As Long)
    Dim rng As Range
    Set rng = ws.Range(celda)
    Dim btn As Button
    Set btn = ws.Buttons.Add(rng.Left + 1, rng.Top + 1, rng.Width - 2, rng.Height - 2)
    With btn
        .Caption = texto
        .OnAction = macro
        .Font.Size = 9
        .Font.Bold = True
    End With
End Sub

' ---------------------------------------------------------------
' Referencia a la hoja principal de la UI
' ---------------------------------------------------------------
Public Function HojaUI() As Worksheet
    On Error Resume Next
    Set HojaUI = ThisWorkbook.Sheets(HOJA_UI)
    On Error GoTo 0
End Function
