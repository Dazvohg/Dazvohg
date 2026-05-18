VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

' ==============================================================
' ThisWorkbook  -  Eventos del libro
' ==============================================================

Private Sub Workbook_Open()
    ' Configurar la hoja de interfaz al abrir el libro
    modPrincipal.ConfigurarHoja
End Sub
