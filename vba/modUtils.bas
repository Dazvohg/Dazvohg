Attribute VB_Name = "modUtils"
Option Explicit

' ==============================================================
' modUtils  -  Utilidades generales
' ==============================================================

' --------------------------------------------------------------
' Devuelve la carpeta TEMP del sistema con barra final
' --------------------------------------------------------------
Public Function CarpetaTemp() As String
    CarpetaTemp = Environ("TEMP") & "\"
End Function

' --------------------------------------------------------------
' Comprueba si un archivo existe
' --------------------------------------------------------------
Public Function ArchivoExiste(ByVal ruta As String) As Boolean
    ArchivoExiste = (Dir(ruta) <> "")
End Function

' --------------------------------------------------------------
' Lee un archivo de texto completo (auto-detecta encoding)
' --------------------------------------------------------------
Public Function LeerArchivo(ByVal ruta As String) As String
    Dim fso As Object, ts As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FileExists(ruta) Then Exit Function
    Set ts = fso.OpenTextFile(ruta, 1, False, -2)   ' -2 = TristateUseDefault
    If Not ts.AtEndOfStream Then LeerArchivo = ts.ReadAll
    ts.Close
End Function

' --------------------------------------------------------------
' Escribe un archivo de texto en UTF-8
' --------------------------------------------------------------
Public Sub EscribirArchivo(ByVal ruta As String, ByVal texto As String)
    Dim fso As Object, ts As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set ts = fso.CreateTextFile(ruta, True, True)   ' True=overwrite, True=Unicode
    ts.Write texto
    ts.Close
End Sub

' --------------------------------------------------------------
' Crea una carpeta si no existe
' --------------------------------------------------------------
Public Sub CrearCarpeta(ByVal ruta As String)
    If Not ArchivoExiste(ruta) Then
        On Error Resume Next
        MkDir ruta
        On Error GoTo 0
    End If
End Sub

' --------------------------------------------------------------
' Elimina una carpeta y todo su contenido
' --------------------------------------------------------------
Public Sub EliminarCarpeta(ByVal ruta As String)
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    On Error Resume Next
    If fso.FolderExists(ruta) Then fso.DeleteFolder ruta, True
    On Error GoTo 0
End Sub

' --------------------------------------------------------------
' Ejecuta un comando de forma sincrona (espera a que termine).
' Devuelve el codigo de salida (0 = exito).
' --------------------------------------------------------------
Public Function EjecutarSync(ByVal cmd As String) As Long
    Dim wsh As Object
    Set wsh = CreateObject("WScript.Shell")
    EjecutarSync = wsh.Run("cmd.exe /C " & cmd, 0, True)
End Function

' --------------------------------------------------------------
' Escribe un script PowerShell en disco, lo ejecuta y devuelve
' el contenido de la salida estandar.
' --------------------------------------------------------------
Public Function EjecutarPS(ByVal codigoPS As String) As String
    Dim tmpScript As String, tmpSalida As String
    tmpScript = CarpetaTemp() & "lf_ps_script.ps1"
    tmpSalida = CarpetaTemp() & "lf_ps_salida.txt"

    EscribirArchivo tmpScript, codigoPS

    Dim cmd As String
    cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & _
          tmpScript & """ > """ & tmpSalida & """ 2>&1"

    EjecutarSync cmd

    If ArchivoExiste(tmpSalida) Then
        EjecutarPS = LeerArchivo(tmpSalida)
    End If

    On Error Resume Next
    Kill tmpScript
    Kill tmpSalida
    On Error GoTo 0
End Function

' --------------------------------------------------------------
' Muestra un mensaje en la barra de estado de Excel
' --------------------------------------------------------------
Public Sub Estado(ByVal msg As String)
    Application.StatusBar = "[Lector Facturas] " & msg
    DoEvents
End Sub

' --------------------------------------------------------------
' Restaura la barra de estado
' --------------------------------------------------------------
Public Sub LimpiarEstado()
    Application.StatusBar = False
End Sub

' --------------------------------------------------------------
' Genera una subcarpeta temporal unica para esta sesion
' --------------------------------------------------------------
Public Function CarpetaTempUnica() As String
    Dim ruta As String
    ruta = CarpetaTemp() & "lf_ocr_" & Format(Now, "HHmmss") & "\"
    CrearCarpeta ruta
    CarpetaTempUnica = ruta
End Function

' --------------------------------------------------------------
' Cuenta cuantos campos tienen valor real (no "No encontrado")
' --------------------------------------------------------------
Public Function ContarEncontrados(campos() As CampoFactura) As Integer
    Dim i As Integer, n As Integer
    For i = 0 To UBound(campos)
        If campos(i).Valor <> "No encontrado" Then n = n + 1
    Next i
    ContarEncontrados = n
End Function
