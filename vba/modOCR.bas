Attribute VB_Name = "modOCR"
Option Explicit

' ==============================================================
' modOCR  -  Pipeline OCR para PDFs escaneados
' 1. Renderizar paginas a PNG ~288 DPI (Windows.Data.Pdf)
' 2. OCR: Windows.Media.Ocr (nativo) → Tesseract (fallback)
' ==============================================================

Public Function OCRCompletoPDF(ByVal rutaPDF As String) As String
    Dim carpeta As String
    carpeta = CarpetaTempUnica()

    Estado "OCR: Renderizando paginas del PDF a imagenes..."
    Dim nPags As Integer
    nPags = RenderizarPDF(rutaPDF, carpeta)

    If nPags = 0 Then
        EliminarCarpeta carpeta
        MsgBox "No se pudieron renderizar las paginas del PDF.", vbExclamation
        OCRCompletoPDF = ""
        Exit Function
    End If

    Dim textoFinal As String, i As Integer
    For i = 1 To nPags
        Estado "OCR: Procesando pagina " & i & " de " & nPags & "..."
        Dim imgPath As String
        imgPath = carpeta & "pag_" & Format(i, "000") & ".png"
        If ArchivoExiste(imgPath) Then
            Dim textoPag As String
            textoPag = OCRImagen(imgPath)
            If Len(Trim(textoPag)) > 0 Then
                textoFinal = textoFinal & textoPag & vbNewLine & _
                             "--- pagina " & i & " ---" & vbNewLine
            End If
        End If
    Next i

    EliminarCarpeta carpeta
    OCRCompletoPDF = textoFinal
End Function

' ---------------------------------------------------------------
' Renderiza cada pagina del PDF como PNG (~288 DPI).
' Devuelve el numero de paginas renderizadas (0 = error).
' ---------------------------------------------------------------
Private Function RenderizarPDF(ByVal rutaPDF As String, _
                                ByVal carpeta As String) As Integer
    Dim tmpContador As String
    tmpContador = CarpetaTemp() & "lf_paginas.txt"

    Dim ps(38) As String
    ps(0)  = "Add-Type -AssemblyName System.Runtime.WindowsRuntime"
    ps(1)  = "$null=[Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]"
    ps(2)  = "$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]"
    ps(3)  = "$null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]"
    ps(4)  = ""
    ps(5)  = "function Await($t,$type){"
    ps(6)  = "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|"
    ps(7)  = "    Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and"
    ps(8)  = "    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation``1'})[0]"
    ps(9)  = "  $x=$m.MakeGenericMethod($type).Invoke($null,@($t)); $x.Wait(-1)|Out-Null; return $x.Result"
    ps(10) = "}"
    ps(11) = "function AwaitAct($t){"
    ps(12) = "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|"
    ps(13) = "    Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and"
    ps(14) = "    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'})[0]"
    ps(15) = "  $x=$m.Invoke($null,@($t)); $x.Wait(-1)|Out-Null"
    ps(16) = "}"
    ps(17) = ""
    ps(18) = "try {"
    ps(19) = "  $pdf   = '" & rutaPDF & "'"
    ps(20) = "  $out   = '" & Left(carpeta, Len(carpeta) - 1) & "'"
    ps(21) = "  $count = '" & tmpContador & "'"
    ps(22) = "  $f=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdf)) ([Windows.Storage.StorageFile])"
    ps(23) = "  $d=Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($f)) ([Windows.Data.Pdf.PdfDocument])"
    ps(24) = "  $n=[int]$d.PageCount"
    ps(25) = "  [IO.File]::WriteAllText($count, $n)"
    ps(26) = "  for($i=0;$i -lt $n;$i++){"
    ps(27) = "    $page=$d.GetPage($i)"
    ps(28) = "    $stream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new()"
    ps(29) = "    $opts=[Windows.Data.Pdf.PdfPageRenderOptions]::new()"
    ps(30) = "    $opts.DestinationWidth=[uint32]([math]::Round($page.Size.Width*3))"
    ps(31) = "    AwaitAct ($page.RenderToStreamAsync($stream,$opts))"
    ps(32) = "    $reader=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)"
    ps(33) = "    $outPath=Join-Path $out ('pag_'+($i+1).ToString('000')+'.png')"
    ps(34) = "    $writer=[IO.File]::OpenWrite($outPath)"
    ps(35) = "    $reader.CopyTo($writer)"
    ps(36) = "    $writer.Close(); $reader.Close(); $stream.Dispose()"
    ps(37) = "  }"
    ps(38) = "} catch { Write-Output ""ERROR: $_"" }"

    EjecutarPS Join(ps, vbNewLine)

    If ArchivoExiste(tmpContador) Then
        Dim contenido As String
        contenido = Trim(LeerArchivo(tmpContador))
        On Error Resume Next: Kill tmpContador: On Error GoTo 0
        If IsNumeric(contenido) Then RenderizarPDF = CInt(contenido)
    End If
End Function

' ---------------------------------------------------------------
' Aplica OCR a una imagen PNG.
' Prioridad: Windows.Media.Ocr → Tesseract
' ---------------------------------------------------------------
Private Function OCRImagen(ByVal imagePath As String) As String
    Dim texto As String
    texto = OCRWindowsNativo(imagePath)
    If Len(Trim(texto)) > 10 Then
        OCRImagen = texto
        Exit Function
    End If
    OCRImagen = OCRTesseract(imagePath)
End Function

' ---------------------------------------------------------------
' OCR nativo Windows 10+ (Windows.Media.Ocr).
' Idioma: espanol > ingles > perfil usuario.
' ---------------------------------------------------------------
Private Function OCRWindowsNativo(ByVal imagePath As String) As String
    Dim tmpSalida As String
    tmpSalida = CarpetaTemp() & "lf_ocr_texto.txt"

    Dim ps(28) As String
    ps(0)  = "Add-Type -AssemblyName System.Runtime.WindowsRuntime"
    ps(1)  = "$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]"
    ps(2)  = "$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]"
    ps(3)  = "$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]"
    ps(4)  = ""
    ps(5)  = "function Await($t,$type){"
    ps(6)  = "  $m=([System.WindowsRuntimeSystemExtensions].GetMethods()|"
    ps(7)  = "    Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and"
    ps(8)  = "    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation``1'})[0]"
    ps(9)  = "  $x=$m.MakeGenericMethod($type).Invoke($null,@($t)); $x.Wait(-1)|Out-Null; return $x.Result"
    ps(10) = "}"
    ps(11) = ""
    ps(12) = "try {"
    ps(13) = "  $img='" & imagePath & "'"
    ps(14) = "  $out='" & tmpSalida & "'"
    ps(15) = "  $file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($img)) ([Windows.Storage.StorageFile])"
    ps(16) = "  $stm=Await ($file.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])"
    ps(17) = "  $dec=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stm)) ([Windows.Graphics.Imaging.BitmapDecoder])"
    ps(18) = "  $bmp=Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])"
    ps(19) = "  $langs=[Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages"
    ps(20) = "  $lang=$langs|Where-Object{$_.LanguageTag -like 'es*'}|Select-Object -First 1"
    ps(21) = "  if(-not $lang){$lang=$langs|Where-Object{$_.LanguageTag -like 'en*'}|Select-Object -First 1}"
    ps(22) = "  if($lang){ $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang) }"
    ps(23) = "  else      { $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }"
    ps(24) = "  if(-not $engine){ throw 'Motor OCR no disponible' }"
    ps(25) = "  $res=Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])"
    ps(26) = "  $txt=($res.Lines|ForEach-Object{$_.Text}) -join [Environment]::NewLine"
    ps(27) = "  [IO.File]::WriteAllText($out,$txt,[Text.Encoding]::UTF8)"
    ps(28) = "} catch { Write-Output ""ERROR_OCR: $_"" }"

    EjecutarPS Join(ps, vbNewLine)

    If ArchivoExiste(tmpSalida) Then
        Dim resultado As String
        resultado = LeerArchivo(tmpSalida)
        On Error Resume Next: Kill tmpSalida: On Error GoTo 0
        If Left(resultado, 9) <> "ERROR_OCR" Then OCRWindowsNativo = resultado
    End If
End Function

' ---------------------------------------------------------------
' OCR con Tesseract (fallback). Requiere tesseract.exe en PATH.
' ---------------------------------------------------------------
Private Function OCRTesseract(ByVal imagePath As String) As String
    If EjecutarSync("where tesseract > nul 2>&1") <> 0 Then
        OCRTesseract = ""
        Exit Function
    End If
    Dim tmpBase As String
    tmpBase = CarpetaTemp() & "lf_tess_out"
    EjecutarSync "tesseract """ & imagePath & """ """ & tmpBase & _
                 """ -l spa+eng --oem 3 --psm 6 > nul 2>&1"
    Dim archivoTxt As String: archivoTxt = tmpBase & ".txt"
    If ArchivoExiste(archivoTxt) Then
        OCRTesseract = LeerArchivo(archivoTxt)
        On Error Resume Next: Kill archivoTxt: On Error GoTo 0
    End If
End Function
