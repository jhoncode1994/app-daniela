Write-Host "Revision del servidor para el despliegue"
Write-Host "========================================"
Write-Host "Fecha: $(Get-Date)"
Write-Host ""
Write-Host "Sistema operativo:"
systeminfo | Select-String -Pattern "Nombre del sistema operativo","OS Name","Tipo de sistema","System Type","Version"
Write-Host ""
Write-Host "Docker:"
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker --version
  docker compose version
} else {
  Write-Host "Docker NO esta instalado"
}
Write-Host ""
Write-Host "Node:"
if (Get-Command node -ErrorAction SilentlyContinue) {
  node -v
  npm -v
} else {
  Write-Host "Node no es necesario en el servidor si se usa solo Docker"
}
