
# 📄 Fastlane Setup para Proyecto React Native Android

## ✅ Requisitos previos

Antes de poder ejecutar `fastlane` en este proyecto, debes tener lo siguiente instalado:

## 1️⃣ Ruby

**Fastlane** funciona sobre Ruby. Dependiendo de tu sistema operativo, instálalo de la siguiente forma:

### 🟦 Windows  
Puedes descargar e instalar Ruby desde 👉 [https://rubyinstaller.org/](https://rubyinstaller.org/)  
> ⚠ **Durante la instalación, asegúrate de marcar la opción "Add Ruby to PATH".**

Verifica que Ruby esté correctamente instalado:  
```bash
ruby -v
```

---

### 🍎 macOS
En Mac, puedes instalar Ruby fácilmente usando **Homebrew**:  
```bash
brew install ruby
```

Verifica la instalación:  
```bash
ruby -v
```

Si deseas que la instalación de `brew` tenga efecto en todas tus terminales, recuerda añadir la ruta de Ruby a tu `.zshrc` o `.bashrc`, Homebrew te indicará cómo hacerlo al finalizar la instalación.

---

### 📦 Bundler

Ruby normalmente ya incluye `bundler`. Verifica si está disponible:

```bash
bundle -v
```

Si no está instalado, puedes instalarlo manualmente:

```bash
gem install bundler
```

---

## 2️⃣ Instalar dependencias del proyecto (bundle install)

Este proyecto tiene definido `fastlane` como dependencia en su archivo `Gemfile`.  
Para instalar todas las dependencias necesarias, desde la raiz dirígete a la carpeta `android` y ejecuta:

```bash
bundle install
```

Esto instalará `fastlane` y cualquier otra dependencia de Ruby.

---

## 3️⃣ Android SDK & Java JDK

Asegúrate de tener instalados:

* Android Studio
* SDK correctamente configurado
* Java JDK

---

# 📂 Variables de entorno (.env)

En la raíz de la carpeta `android/fastlane` crea un archivo `.env` con tus credenciales y configuraciones:

```dotenv
FIREBASE_TOKEN=tu-token-de-firebase
FIREBASE_APP_ID=tu-app-id-de-firebase
```

### 🔑 Cómo obtener `FIREBASE_TOKEN`

Para poder obtener tu `FIREBASE_TOKEN`, necesitas tener instalado previamente [Firebase CLI](https://firebase.google.com/docs/cli).  
Instálalo globalmente con:

```bash
npm install -g firebase-tools
```

Una vez instalada la CLI de Firebase, ejecuta el siguiente comando para autenticarte y obtener tu token:

```bash
firebase login:ci
```

Este comando abrirá una ventana del navegador para que inicies sesión en tu cuenta de Firebase.  
Al finalizar, te mostrará un token que debes copiar y pegar en tu archivo `.env` como `FIREBASE_TOKEN`.

---

# 🚀 Comandos útiles

### Generar una nueva beta y distribuirla a Firebase

```bash
fastlane android beta
```
o con versión y build number explícito:

```bash
fastlane beta version:"1.0.0" build_number:100
```

### Hacer deploy a Google Play

```bash
fastlane android deploy
```

### Ejecutar tests

```bash
fastlane android test
```

---

# 🛠️ Detalles adicionales

* El archivo `Constants.ts` contiene la URL del ambiente y es **modificado automáticamente** por `fastlane` según tu configuración.
* Se realiza commit automático después de cada distribución.

---

# 📚 Recursos

* [Fastlane Android](https://docs.fastlane.tools/getting-started/android/setup/)
* [Firebase App Distribution](https://firebase.google.com/docs/app-distribution)
* [RubyInstaller Windows](https://rubyinstaller.org/)
