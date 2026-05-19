Attribute VB_Name = "INSTALAR"
Option Explicit

' ==============================================================
' INSTALAR.bas
'
' Como usar este archivo:
'   1. Abre Excel y presiona Alt+F11 para abrir el editor VBA.
'   2. Menu Insertar > Modulo.
'   3. Pega el contenido de este archivo en el modulo nuevo.
'   4. Modifica la variable CARPETA_VBA con la ruta donde
'      guardaste los archivos .bas y .cls.
'   5. Presiona F5 o ejecuta la macro InstalarModulos().
'   6. Una vez instalado, podes eliminar este modulo.
'
' El instalador:
'   - Importa los 4 modulos + ThisWorkbook automaticamente
'   - Activa el acceso programatico al modelo de objetos VBA
'     (necesario para importar modulos en Excel 2013+)
' ==============================================================

Public Sub InstalarModulos()
    ' *** MODIFICAR ESTA RUTA ***
    Dim CARPETA_VBA As String
    CARPETA_VBA = "C:\ruta\a\los\archivos\vba\"   ' <-- cambiar aqui

    ' Verificar que la carpeta exista
    If Dir(CARPETA_VBA, vbDirectory) = "" Then
        MsgBox "Carpeta no encontrada: " & CARPETA_VBA & vbNewLine & _
               "Modifica la variable CARPETA_VBA en este modulo.", _
               vbCritical, "Error de instalacion"
        Exit Sub
    End If

    Dim vbp As Object
    Set vbp = ThisWorkbook.VBProject

    ' Archivos a importar
    Dim archivos(5) As String
    archivos(0) = CARPETA_VBA & "modUtils.bas"
    archivos(1) = CARPETA_VBA & "modCampos.bas"
    archivos(2) = CARPETA_VBA & "modExtractorPDF.bas"
    archivos(3) = CARPETA_VBA & "modOCR.bas"
    archivos(4) = CARPETA_VBA & "modConfiguracion.bas"
    archivos(5) = CARPETA_VBA & "modPrincipal.bas"

    ' Nombres de los modulos (para eliminar si ya existen)
    Dim nombres(5) As String
    nombres(0) = "modUtils"
    nombres(1) = "modCampos"
    nombres(2) = "modExtractorPDF"
    nombres(3) = "modOCR"
    nombres(4) = "modConfiguracion"
    nombres(5) = "modPrincipal"

    ' Eliminar modulos previos si existen
    Dim i As Integer
    For i = 0 To 5
        EliminarModulo vbp, nombres(i)
    Next i

    ' Importar modulos
    For i = 0 To 5
        If Dir(archivos(i)) <> "" Then
            vbp.VBComponents.Import archivos(i)
        Else
            MsgBox "Archivo no encontrado: " & archivos(i), vbExclamation
        End If
    Next i

    ' Reemplazar el codigo de ThisWorkbook
    Dim tbCode As String
    tbCode = "Private Sub Workbook_Open()" & vbNewLine & _
             "    modPrincipal.ConfigurarHoja" & vbNewLine & _
             "End Sub"
    With vbp.VBComponents("ThisWorkbook").CodeModule
        .DeleteLines 1, .CountOfLines
        .InsertLines 1, tbCode
    End With

    ' Ejecutar configuracion inicial
    modPrincipal.ConfigurarHoja
    modConfiguracion.ConfigurarHojaConfig

    MsgBox "Instalacion completada correctamente." & vbNewLine & vbNewLine & _
           "Hojas creadas:" & vbNewLine & _
           "  - 'Lector de Facturas'  (interfaz principal)" & vbNewLine & _
           "  - 'Configuracion'       (elegir que campos extraer)" & vbNewLine & vbNewLine & _
           "Usa el boton 'Configurar Campos' para personalizar" & vbNewLine & _
           "la extraccion segun el tipo de documento.", _
           vbInformation, "Instalacion"
End Sub

Private Sub EliminarModulo(vbp As Object, nombre As String)
    Dim comp As Object
    On Error Resume Next
    Set comp = vbp.VBComponents(nombre)
    If Not comp Is Nothing Then
        vbp.VBComponents.Remove comp
    End If
    On Error GoTo 0
End Sub
