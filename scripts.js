const params = {
	appName:"graphing",
	width:600,
	heigth:400,
	showToolBar:true,
	showAlgebraInput:true,
	showMenuBar:false
}
const applet = new GGBApplet(params, true)
window.addEventListener("load",() => {
	applet.inject("ggb-element")
})

function crearPunto(){
	const x = (Math.random()*6-3).toFixed(2)
	const y = (Math.random()*6-3).toFixed(2)
	applet.setValue("A", '(${x} , ${y})')
	applet.evalCommand('A = (${x}, ${y})')
}
function graficar(){
	applet.evalCommand("f(x) = sin(x)")
}










