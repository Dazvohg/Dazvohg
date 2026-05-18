Attribute VB_Name = "modExtractorPDF"
Option Explicit

' ==============================================================
' modExtractorPDF  -  Extraccion de texto de archivos PDF
'
' Metodos disponibles (en orden de prioridad):
'   1. Microsoft Word COM  (Word 2013+, convierte PDF a texto)
'   2. Adobe Acrobat COM   (requiere Acrobat Standard/Pro)
'   3. Windows.Data.Pdf via PowerShell  (extrae texto de PDFs nativos)
'
' Si ninguno funciona o el texto es escaso → se activa OCR
' a traves de modOCR.
' ==============================================================

Private Const MIN_CHARS As Long = 80

' ---------------------------------------------------------------
' Punto de entrada principal.
' Intenta extraer texto del PDF con los metodos disponibles.
' Si el texto es escaso o se fuerza OCR, llama al motor OCR.
'
' Parametros:
'   rutaPDF    : ruta completa al archivo .pdf
'   metodo     : (ByRef) devuelve el metodo usado
'   forzarOCR  : si True, omite los metodos nativos
'
' Devuelve el texto completo extraido.
' ---------------------------------------------------------------
Public Function ExtraerTextoPDF(ByVal rutaPDF As String, _
                                 ByRef metodo As String, _
                                 ByVal forzarOCR As Boolean) As String
    Dim texto As String
    metodo = "error"

    If Not forzarOCR Then

        ' --- Intento 1: Word COM ---
        Estado "Extrayendo texto con Microsoft Word..."
        texto = TextoViaWord(rutaPDF)
        If Len(Trim(texto)) >= MIN_CHARS Then
            metodo = "Nativo (Word)"
            ExtraerTextoPDF = texto
            Exit Function
        End If

        ' --- Intento 2: Adobe Acrobat COM ---
        Estado "Intentando con Adobe Acrobat..."
        texto = TextoViaAcrobat(rutaPDF)
        If Len(Trim(texto)) >= MIN_CHARS Then
            metodo = "Nativo (Acrobat)"
            ExtraerTextoPDF = texto
            Exit Function
        End If

        ' --- Intento 3: Windows.Data.Pdf via PowerShell ---
        Estado "Intentando con Windows PDF API..."
        texto = TextoViaWindowsPDF(rutaPDF)
        If Len(Trim(texto)) >= MIN_CHARS Then
            metodo = "Nativo (Windows PDF)"
            ExtraerTextoPDF = texto
            Exit Function
        End If

    End If

    ' --- OCR como ultimo recurso ---
    Estado "PDF escaneado detectado. Iniciando OCR..."
    texto = OCRCompletoPDF(rutaPDF)
    If Len(Trim(texto)) > 0 Then
        metodo = "OCR"
        ExtraerTextoPDF = texto
    Else
        metodo = "error"
        ExtraerTextoPDF = ""
    End If
End Function

' ---------------------------------------------------------------
' Extrae texto usando Microsoft Word como conversor PDF→texto.
' Word 2013+ puede abrir PDFs directamente.
' ---------------------------------------------------------------
Private Function TextoViaWord(ByVal rutaPDF As String) As String
    Dim oWord As Object
    Dim oDoc  As Object

    On Error GoTo ErrorWord
    Set oWord = CreateObject("Word.Application")
    oWord.Visible = False

    Set oDoc = oWord.Documents.Open( _
        FileName:=rutaPDF, _
        ConfirmConversions:=False, _
        ReadOnly:=True, _
        AddToRecentFiles:=False)

    TextoViaWord = oDoc.Content.Text

    oDoc.Close SaveChanges:=False
    oWord.Quit
    Exit Function

ErrorWord:
    On Error Resume Next
    If Not oDoc  Is Nothing Then oDoc.Close SaveChanges:=False
    If Not oWord Is Nothing Then oWord.Quit
    On Error GoTo 0
    TextoViaWord = ""
End Function

' ---------------------------------------------------------------
' Extrae texto usando Adobe Acrobat COM (AcroExch.App).
' Requiere Adobe Acrobat Standard o Pro (no Adobe Reader).
' ---------------------------------------------------------------
Private Function TextoViaAcrobat(ByVal rutaPDF As String) As String
    Dim oApp   As Object
    Dim oPDDoc As Object
    Dim oPage  As Object
    Dim oHi    As Object
    Dim oText  As Object
    Dim texto  As String
    Dim i      As Integer

    On Error GoTo ErrorAcrobat
    Set oApp   = CreateObject("AcroExch.App")
    Set oPDDoc = CreateObject("AcroExch.PDDoc")

    If Not oPDDoc.Open(rutaPDF) Then GoTo ErrorAcrobat

    Dim nPages As Integer
    nPages = oPDDoc.GetNumPages()

    For i = 0 To nPages - 1
        Set oPage = oPDDoc.AcquirePage(i)
        Set oHi   = CreateObject("AcroExch.HiliteList")
        oHi.Add 0, 9999
        Set oText = oPage.CreateWordHilite(oHi)
        If Not oText Is Nothing Then
            texto = texto & oText.GetAsText() & vbNewLine
        End If
    Next i

    oPDDoc.Close
    oApp.Hide
    oApp.Exit
    TextoViaAcrobat = texto
    Exit Function

ErrorAcrobat:
    On Error Resume Next
    If Not oPDDoc Is Nothing Then oPDDoc.Close
    If Not oApp   Is Nothing Then oApp.Exit
    On Error GoTo 0
    TextoViaAcrobat = ""
End Function

' ---------------------------------------------------------------
' Extrae texto usando la API Windows.Data.Pdf via PowerShell.
' Funciona en Windows 10+ sin software adicional.
' Nota: Windows.Data.Pdf solo expone texto en PDFs con texto
'       embebido; para PDFs escaneados devuelve cadena vacia.
' ---------------------------------------------------------------
Private Function TextoViaWindowsPDF(ByVal rutaPDF As String) As String
    Dim tmpSalida As String
    tmpSalida = CarpetaTemp() & "lf_texto_nativo.txt"

    ' Reemplaza las barras simples del path para PowerShell
    Dim pathPS As String
    pathPS = rutaPDF

    Dim ps As String
    ps = "Add-Type -AssemblyName System.Runtime.WindowsRuntime" & vbNewLine & _
         "$null = [Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]" & vbNewLine & _
         "$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]" & vbNewLine & _
         "" & vbNewLine & _
         "function Await($task,$type){" & vbNewLine & _
         "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{" & vbNewLine & _
         "    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and" & vbNewLine & _
         "    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation``1'})[0]" & vbNewLine & _
         "  $t=$m.MakeGenericMethod($type).Invoke($null,@($task))" & vbNewLine & _
         "  $t.Wait(-1)|Out-Null; return $t.Result" & vbNewLine & _
         "}" & vbNewLine & _
         "" & vbNewLine & _
         "try {" & vbNewLine & _
         "  $f=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('" & pathPS & "')) ([Windows.Storage.StorageFile])" & vbNewLine & _
         "  $d=Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($f)) ([Windows.Data.Pdf.PdfDocument])" & vbNewLine & _
         "  $sb=[System.Text.StringBuilder]::new()" & vbNewLine & _
         "  for($i=0;$i -lt $d.PageCount;$i++){" & vbNewLine & _
         "    $p=$d.GetPage($i)" & vbNewLine & _
         "    $sb.AppendLine($p.GetTextRange(0,$p.GetLength())) | Out-Null" & vbNewLine & _
         "  }" & vbNewLine & _
         "  [IO.File]::WriteAllText('" & tmpSalida & "',$sb.ToString(),[Text.Encoding]::UTF8)" & vbNewLine & _
         "} catch { Write-Output ""ERROR: $_"" }"

    EjecutarPS ps

    If ArchivoExiste(tmpSalida) Then
        TextoViaWindowsPDF = LeerArchivo(tmpSalida)
        On Error Resume Next: Kill tmpSalida: On Error GoTo 0
    End If
End Function
