import './base.css'
import { devtools } from 'chrome'
import App from './App.svelte'

function setDarkMode(theme) {
  if (theme == 'dark') document.body.classList.add('dark')
  else document.body.classList.remove('dark')
}

setDarkMode(devtools.panels.themeName)
if (devtools.panels.onThemeChanged)
  devtools.panels.onThemeChanged.addListener(setDarkMode)
console.log(App)
new App({ target: document.body })
