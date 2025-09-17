const data = [{
	x: [0,1,2,3,4],
	y: [0,1,4,9,16],
	type:'scatter',
	mode: 'lines+markers'
}];
function saludar(){
	console.log('hello world!!');
};
function graficar() {
	const config = {
		staticPlot: false
	};
	const x1 = parseFloat(document.getElementById("x1").value);
	const y1 = parseFloat(document.getElementById("y1").value);
	const x2 = parseFloat(document.getElementById("x2").value);
	const y2 = parseFloat(document.getElementById("y2").value);
	
	const data2 = [{
		x: [x1, y1],
		y: [x2, y2],
		type: 'scatter',
		mode: 'lines+markers',
		line: {
			color: 'blue',
			width: 3
		},
		marker: {
			color:'red',
			size: 10
		},
		fill:'tozeroy',
		fillcolor: 'rgba(0 ,0 , 255, 0.2)'
	}];
	const layout = {
		title: "ejemplo de grafico",
		paper_bgcolor: "#1e1e2f",
		plot_bgcolor: "#0f172a",
		xaxis: {
			title: 'eje x',
			range: [0,10],
			fixedrange: true
		},
		yaxis: {
			title: 'eje y',
			range: [0,20], 
			fixedrange: true
		}
	};
	Plotly.newPlot('aux', data2, layout,config);
};
graficar();

