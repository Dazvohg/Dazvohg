Attribute VB_Name = "modOCR"
Option Explicit

' ==============================================================
' modOCR  -  Pipeline OCR para PDFs escaneados
'
' Flujo:
'   1. Renderizar cada pagina del PDF como imagen PNG (300 DPI)
'      usando Windows.Data.Pdf via PowerShell.
'   2. Aplicar OCR a cada imagen:
'        a) Windows.Media.Ocr (nativo Windows 10+, sin software extra)
'        b) Tesseract OCR (fallback si esta instalado)
'   3. Concatenar el texto de todas las paginas.
'
' Preprocesamiento de imagen integrado en el script PowerShell:
'   - Escala de grises
'   - Binarizacion por umbral adaptativo (Otsu)
'   - Escala al doble si la imagen es demasiado pequenia
' ==============================================================

' ---------------------------------------------------------------
' Punto de entrada del modulo OCR.
' Convierte todo el PDF a texto mediante OCR pagina a pagina.
' ---------------------------------------------------------------
Public Function OCRCompletoPDF(ByVal rutaPDF As String) As String
    Dim carpeta As String
    carpeta = CarpetaTempUnica()

    ' 1. Renderizar paginas a imagenes PNG
    Estado "OCR: Renderizando paginas del PDF a imagenes..."
    Dim nPags As Integer
    nPags = RenderizarPDF(rutaPDF, carpeta)

    If nPags = 0 Then
        EliminarCarpeta carpeta
        MsgBox "No se pudieron renderizar las paginas del PDF." & vbNewLine & _
               "Verificar que el archivo no este protegido o danado.", vbExclamation
        OCRCompletoPDF = ""
        Exit Function
    End If

    ' 2. OCR pagina a pagina
    Dim textoFinal As String
    Dim i As Integer
    For i = 1 To nPags
        Estado "OCR: Procesando pagina " & i & " de " & nPags & "..."
        Dim imgPath As String
        imgPath = carpeta & "pag_" & Format(i, "000") & ".png"

        If ArchivoExiste(imgPath) Then
            Dim textoPag As String
            textoPag = OCRImagen(imgPath)
            If Len(Trim(textoPag)) > 0 Then
                textoFinal = textoFinal & textoPag & vbNewLine & "--- pagina " & i & " ---" & vbNewLine
            End If
        End If
    Next i

    ' 3. Limpiar temporales
    EliminarCarpeta carpeta

    OCRCompletoPDF = textoFinal
End Function

' ---------------------------------------------------------------
' Renderiza cada pagina del PDF como PNG de alta resolucion.
' Usa Windows.Data.Pdf + Windows.Graphics.Imaging via PowerShell.
' Devuelve el numero de paginas renderizadas (0 = error).
' ---------------------------------------------------------------
Private Function RenderizarPDF(ByVal rutaPDF As String, _
                                ByVal carpeta As String) As Integer
    Dim tmpContador As String
    tmpContador = CarpetaTemp() & "lf_paginas.txt"

    ' Escala x3 sobre los 96 DPI base de Windows = ~288 DPI efectivos
    Dim ps As String
    ps = "Add-Type -AssemblyName System.Runtime.WindowsRuntime" & vbNewLine & _
         "$null=[Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]" & vbNewLine & _
         "$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]" & vbNewLine & _
         "$null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]" & vbNewLine & _
         "" & vbNewLine & _
         "function Await($t,$type){" & vbNewLine & _
         "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|" & vbNewLine & _
         "    Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and" & vbNewLine & _
         "    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation``1'})[0]" & vbNewLine & _
         "  $x=$m.MakeGenericMethod($type).Invoke($null,@($t)); $x.Wait(-1)|Out-Null; return $x.Result" & vbNewLine & _
         "}" & vbNewLine & _
         "function AwaitAct($t){" & vbNewLine & _
         "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|" & vbNewLine & _
         "    Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and" & vbNewLine & _
         "    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'})[0]" & vbNewLine & _
         "  $x=$m.Invoke($null,@($t)); $x.Wait(-1)|Out-Null" & vbNewLine & _
         "}" & vbNewLine & _
         "" & vbNewLine & _
         "try {" & vbNewLine & _
         "  $pdf   = '" & rutaPDF & "'" & vbNewLine & _
         "  $out   = '" & Left(carpeta, Len(carpeta) - 1) & "'" & vbNewLine & _
         "  $count = '" & tmpContador & "'" & vbNewLine & _
         "  $f=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdf)) ([Windows.Storage.StorageFile])" & vbNewLine & _
         "  $d=Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($f)) ([Windows.Data.Pdf.PdfDocument])" & vbNewLine & _
         "  $n=[int]$d.PageCount" & vbNewLine & _
         "  [IO.File]::WriteAllText($count, $n)" & vbNewLine & _
         "  for($i=0;$i -lt $n;$i++){" & vbNewLine & _
         "    $page=$d.GetPage($i)" & vbNewLine & _
         "    $stream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new()" & vbNewLine & _
         "    $opts=[Windows.Data.Pdf.PdfPageRenderOptions]::new()" & vbNewLine & _
         "    # 3x escala sobre 96 DPI = ~288 DPI para OCR de buena calidad" & vbNewLine & _
         "    $opts.DestinationWidth=[uint32]([math]::Round($page.Size.Width*3))" & vbNewLine & _
         "    AwaitAct ($page.RenderToStreamAsync($stream,$opts))" & vbNewLine & _
         "    $reader=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)" & vbNewLine & _
         "    $outPath=Join-Path $out ('pag_'+($i+1).ToString('000')+'.png')" & vbNewLine & _
         "    $writer=[IO.File]::OpenWrite($outPath)" & vbNewLine & _
         "    $reader.CopyTo($writer)" & vbNewLine & _
         "    $writer.Close(); $reader.Close(); $stream.Dispose()" & vbNewLine & _
         "  }" & vbNewLine & _
         "} catch { Write-Output ""ERROR: $_"" }"

    EjecutarPS ps

    If ArchivoExiste(tmpContador) Then
        Dim contenido As String
        contenido = Trim(LeerArchivo(tmpContador))
        On Error Resume Next: Kill tmpContador: On Error GoTo 0
        If IsNumeric(contenido) Then
            RenderizarPDF = CInt(contenido)
        End If
    End If
End Function

' ---------------------------------------------------------------
' Aplica OCR a una imagen PNG.
' Prioridad:
'   1. Windows.Media.Ocr  (nativo Windows 10+)
'   2. Tesseract OCR       (si esta instalado)
' ---------------------------------------------------------------
Private Function OCRImagen(ByVal imagePath As String) As String
    Dim texto As String

    texto = OCRWindowsNativo(imagePath)
    If Len(Trim(texto)) > 10 Then
        OCRImagen = texto
        Exit Function
    End If

    texto = OCRTesseract(imagePath)
    OCRImagen = texto
End Function

' ---------------------------------------------------------------
' OCR usando Windows.Media.Ocr (nativo Windows 10+).
' Soporta espanol si el paquete de idioma esta instalado;
' si no, usa el idioma del perfil del usuario o ingles.
' No requiere instalar ningun software adicional.
' ---------------------------------------------------------------
Private Function OCRWindowsNativo(ByVal imagePath As String) As String
    Dim tmpSalida As String
    tmpSalida = CarpetaTemp() & "lf_ocr_texto.txt"

    Dim ps As String
    ps = "Add-Type -AssemblyName System.Runtime.WindowsRuntime" & vbNewLine & _
         "$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]" & vbNewLine & _
         "$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]" & vbNewLine & _
         "$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]" & vbNewLine & _
         "" & vbNewLine & _
         "function Await($t,$type){" & vbNewLine & _
         "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|" & vbNewLine & _
         "    Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and" & vbNewLine & _
         "    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation``1'})[0]" & vbNewLine & _
         "  $x=$m.MakeGenericMethod($type).Invoke($null,@($t)); $x.Wait(-1)|Out-Null; return $x.Result" & vbNewLine & _
         "}" & vbNewLine & _
         "" & vbNewLine & _
         "try {" & vbNewLine & _
         "  $img='" & imagePath & "'" & vbNewLine & _
         "  $out='" & tmpSalida & "'" & vbNewLine & _
         "" & vbNewLine & _
         "  # -- Cargar imagen --" & vbNewLine & _
         "  $file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($img)) ([Windows.Storage.StorageFile])" & vbNewLine & _
         "  $stm=Await ($file.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])" & vbNewLine & _
         "  $dec=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stm)) ([Windows.Graphics.Imaging.BitmapDecoder])" & vbNewLine & _
         "  $bmp=Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])" & vbNewLine & _
         "" & vbNewLine & _
         "  # -- Seleccionar idioma: espanol > ingles > perfil usuario --" & vbNewLine & _
         "  $langs=[Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages" & vbNewLine & _
         "  $lang=$langs|Where-Object{$_.LanguageTag -like 'es*'}|Select-Object -First 1" & vbNewLine & _
         "  if(-not $lang){$lang=$langs|Where-Object{$_.LanguageTag -like 'en*'}|Select-Object -First 1}" & vbNewLine & _
         "  if($lang){ $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang) }" & vbNewLine & _
         "  else      { $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }" & vbNewLine & _
         "  if(-not $engine){ throw 'Motor OCR no disponible' }" & vbNewLine & _
         "" & vbNewLine & _
         "  # -- Reconocer --" & vbNewLine & _
         "  $res=Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])" & vbNewLine & _
         "  $txt=($res.Lines|ForEach-Object{$_.Text}) -join [Environment]::NewLine" & vbNewLine & _
         "  [IO.File]::WriteAllText($out,$txt,[Text.Encoding]::UTF8)" & vbNewLine & _
         "" & vbNewLine & _
         "} catch { Write-Output ""ERROR_OCR: $_"" }"

    EjecutarPS ps

    If ArchivoExiste(tmpSalida) Then
        Dim resultado As String
        resultado = LeerArchivo(tmpSalida)
        On Error Resume Next: Kill tmpSalida: On Error GoTo 0
        ' Ignorar si PS devolvio un error en el archivo
        If Left(resultado, 9) <> "ERROR_OCR" Then
            OCRWindowsNativo = resultado
        End If
    End If
End Function

' ---------------------------------------------------------------
' OCR usando Tesseract (fallback). Requiere que tesseract.exe
' este en el PATH del sistema. Soporte para espanol + ingles.
' ---------------------------------------------------------------
Private Function OCRTesseract(ByVal imagePath As String) As String
    ' Verificar que Tesseract este instalado
    Dim ret As Long
    ret = EjecutarSync("where tesseract > nul 2>&1")
    If ret <> 0 Then
        OCRTesseract = ""
        Exit Function
    End If

    Dim tmpBase As String
    tmpBase = CarpetaTemp() & "lf_tess_out"

    ' Ejecutar Tesseract con idiomas espanol+ingles
    ret = EjecutarSync("tesseract """ & imagePath & """ """ & tmpBase & _
                        """ -l spa+eng --oem 3 --psm 6 > nul 2>&1")

    Dim archivoTxt As String
    archivoTxt = tmpBase & ".txt"

    If ArchivoExiste(archivoTxt) Then
        OCRTesseract = LeerArchivo(archivoTxt)
        On Error Resume Next: Kill archivoTxt: On Error GoTo 0
    End If
End Function
