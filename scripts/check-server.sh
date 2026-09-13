#!/usr/bin/env sh
echo "Revision del servidor para el despliegue"
echo "========================================"
echo "Fecha: $(date)"
echo
echo "Sistema operativo:"
uname -a
if [ -f /etc/os-release ]; then
  cat /etc/os-release
fi
echo
echo "Docker:"
if command -v docker >/dev/null 2>&1; then
  docker --version
  docker compose version || docker-compose --version
else
  echo "Docker NO esta instalado"
fi
echo
echo "Node:"
if command -v node >/dev/null 2>&1; then
  node -v
  npm -v
else
  echo "Node no es necesario en el servidor si se usa solo Docker"
fi
