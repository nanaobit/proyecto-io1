   // Variables globales
        let ggbApp = null;
        let currentSolution = null;
        let constraintColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];

        // Inicializar GeoGebra
        function initGeoGebra() {
            const ggbApp = new GGBApplet({
                "appName": "graphing",
                "width": 800,
                "height": 500,
                "showToolBar": false,
                "showAlgebraInput": false,
                "showMenuBar": false,
                "enableRightClick": false,
                "enableLabelDrags": false,
                "enableShiftDragZoom": true,
                "enableLabelDrags": false,
                "capturingThreshold": null,
                "language": "es",
                "backgroundColor": "#1a202c",
                "appletOnLoad": onGeoGebraLoad
            }, true);

            ggbApp.inject('ggb-element');
        }

        // Callback cuando GeoGebra se carga
        function onGeoGebraLoad() {
            ggbApp = window.ggbApplet;
            
            // Configuración inicial de GeoGebra con tema oscuro
            ggbApp.setAxisColor(0, "#e2e8f0"); // Eje X
            ggbApp.setAxisColor(1, "#e2e8f0"); // Eje Y
            ggbApp.setGridColor("#4a5568");
            ggbApp.showGrid(true);
            ggbApp.showAxes(true, true);
            
            // Establecer límites de vista inicial
            ggbApp.setCoordSystem(-2, 12, -2, 10);
            
            console.log("📊 GeoGebra cargado exitosamente");
        }

        // Función para agregar restricciones
        function addConstraint() {
            const container = document.getElementById('constraints-container');
            const constraintRow = document.createElement('div');
            constraintRow.className = 'constraint-row';
            constraintRow.innerHTML = `
                <input type="text" placeholder="x + y" class="constraint-left">
                <select class="constraint-operator">
                    <option value="<=">&le;</option>
                    <option value=">=">&ge;</option>
                    <option value="=">=</option>
                </select>
                <input type="number" placeholder="0" class="constraint-right">
                <button type="button" class="btn-remove" onclick="removeConstraint(this)">✕</button>
            `;
            container.appendChild(constraintRow);
        }

        // Función para remover restricciones
        function removeConstraint(button) {
            button.parentElement.remove();
        }

        // Función para limpiar todos los campos
        function clearAll() {
            document.getElementById('objective').value = '';
            const container = document.getElementById('constraints-container');
            container.innerHTML = `
                <div class="constraint-row">
                    <input type="text" placeholder="x + y" class="constraint-left">
                    <select class="constraint-operator">
                        <option value="<=">&le;</option>
                        <option value=">=">&ge;</option>
                        <option value="=">=</option>
                    </select>
                    <input type="number" placeholder="0" class="constraint-right">
                    <button type="button" class="btn-remove" onclick="removeConstraint(this)">✕</button>
                </div>
            `;
            document.getElementById('solution-output').innerHTML = `
                <div class="placeholder">
                    <p>👆 Configura tu problema y presiona "Resolver" para ver los resultados</p>
                </div>
            `;
            
            // Limpiar GeoGebra
            if (ggbApp) {
                ggbApp.deleteObject("*");
                ggbApp.setCoordSystem(-2, 12, -2, 10);
            }
        }

        // Función principal para resolver el problema
        function solveProblem() {
            try {
                const objective = document.getElementById('objective').value.trim();
                const isMaximize = document.querySelector('input[name="optimization"]:checked').value === 'maximize';
                const nonNegative = document.getElementById('non-negative').checked;

                if (!objective) {
                    showError('Por favor, ingresa la función objetivo.');
                    return;
                }

                // Recopilar restricciones
                const constraints = [];
                const constraintRows = document.querySelectorAll('.constraint-row');
                
                constraintRows.forEach(row => {
                    const left = row.querySelector('.constraint-left').value.trim();
                    const operator = row.querySelector('.constraint-operator').value;
                    const right = parseFloat(row.querySelector('.constraint-right').value);
                    
                    if (left && !isNaN(right)) {
                        constraints.push({ left, operator, right });
                    }
                });

                if (constraints.length === 0) {
                    showError('Por favor, agrega al menos una restricción.');
                    return;
                }

                // Resolver usando método simplex simplificado
                const solution = solveSimplex(objective, constraints, isMaximize, nonNegative);
                currentSolution = solution;
                displaySolution(solution);
                plotInGeoGebra(objective, constraints, solution, isMaximize, nonNegative);

            } catch (error) {
                showError('Error al resolver el problema: ' + error.message);
            }
        }

        // Función para mostrar errores
        function showError(message) {
            document.getElementById('solution-output').innerHTML = `
                <div class="error-message">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        }

        // Función para parsear expresiones lineales
        function parseLinearExpression(expr) {
            const coefficients = { x: 0, y: 0 };
            
            // Limpiar espacios y normalizar
            expr = expr.replace(/\s/g, '').toLowerCase();
            
            // Dividir en términos
            const terms = expr.split(/(?=[+-])/);
            
            for (let term of terms) {
                if (!term) continue;
                
                // Buscar coeficiente y variable
                const match = term.match(/([+-]?\d*\.?\d*)([xy]?)/);
                if (match) {
                    const coeff = match[1] === '' ? 1 : match[1] === '+' ? 1 : match[1] === '-' ? -1 : parseFloat(match[1]);
                    const variable = match[2];
                    
                    if (variable === 'x') coefficients.x = coeff;
                    else if (variable === 'y') coefficients.y = coeff;
                }
            }
            
            return coefficients;
        }

        // Algoritmo Simplex simplificado para 2 variables
        function solveSimplex(objective, constraints, isMaximize, nonNegative) {
            const objCoeffs = parseLinearExpression(objective);
            
            // Si es minimización, cambiar signos
            if (!isMaximize) {
                objCoeffs.x *= -1;
                objCoeffs.y *= -1;
            }

            // Convertir restricciones
            const constraintMatrix = [];
            for (let constraint of constraints) {
                const coeffs = parseLinearExpression(constraint.left);
                constraintMatrix.push({
                    x: coeffs.x,
                    y: coeffs.y,
                    operator: constraint.operator,
                    rhs: constraint.right
                });
            }

            // Agregar restricciones de no negatividad si están habilitadas
            if (nonNegative) {
                constraintMatrix.push({ x: 1, y: 0, operator: '>=', rhs: 0 });
                constraintMatrix.push({ x: 0, y: 1, operator: '>=', rhs: 0 });
            }

            // Encontrar puntos de intersección (método gráfico para 2D)
            const vertices = findVertices(constraintMatrix);
            
            if (vertices.length === 0) {
                return { status: 'infeasible', message: 'El problema no tiene solución factible.' };
            }

            // Evaluar función objetivo en cada vértice
            let bestValue = isMaximize ? -Infinity : Infinity;
            let bestPoint = null;
            
            for (let vertex of vertices) {
                const value = objCoeffs.x * vertex.x + objCoeffs.y * vertex.y;
                const actualValue = isMaximize ? value : -value;
                
                if ((isMaximize && value > bestValue) || (!isMaximize && value < bestValue)) {
                    bestValue = value;
                    bestPoint = vertex;
                }
            }

            return {
                status: 'optimal',
                optimalValue: isMaximize ? bestValue : -bestValue,
                variables: bestPoint,
                vertices: vertices,
                constraints: constraintMatrix
            };
        }

        // Encontrar vértices de la región factible
        function findVertices(constraints) {
            const vertices = [];
            
            // Encontrar intersecciones de todas las combinaciones de restricciones
            for (let i = 0; i < constraints.length; i++) {
                for (let j = i + 1; j < constraints.length; j++) {
                    const intersection = findIntersection(constraints[i], constraints[j]);
                    if (intersection && isFeasible(intersection, constraints)) {
                        vertices.push(intersection);
                    }
                }
            }

            // Remover duplicados
            const uniqueVertices = [];
            for (let vertex of vertices) {
                if (!uniqueVertices.some(v => Math.abs(v.x - vertex.x) < 1e-6 && Math.abs(v.y - vertex.y) < 1e-6)) {
                    uniqueVertices.push(vertex);
                }
            }

            return uniqueVertices;
        }

        // Encontrar intersección entre dos restricciones
        function findIntersection(r1, r2) {
            // Convertir restricciones a ecuaciones
            const a1 = r1.x, b1 = r1.y, c1 = r1.rhs;
            const a2 = r2.x, b2 = r2.y, c2 = r2.rhs;
            
            const det = a1 * b2 - a2 * b1;
            
            if (Math.abs(det) < 1e-10) {
                return null; // Líneas paralelas
            }
            
            const x = (c1 * b2 - c2 * b1) / det;
            const y = (a1 * c2 - a2 * c1) / det;
            
            return { x, y };
        }

        // Verificar si un punto es factible
        function isFeasible(point, constraints) {
            for (let constraint of constraints) {
                const value = constraint.x * point.x + constraint.y * point.y;
                
                if (constraint.operator === '<=' && value > constraint.rhs + 1e-6) return false;
                if (constraint.operator === '>=' && value < constraint.rhs - 1e-6) return false;
                if (constraint.operator === '=' && Math.abs(value - constraint.rhs) > 1e-6) return false;
            }
            
            return true;
        }

        // Mostrar la solución
        function displaySolution(solution) {
            const outputDiv = document.getElementById('solution-output');
            
            if (solution.status === 'optimal') {
                outputDiv.innerHTML = `
                    <div class="solution-result optimal">
                        <div class="solution-header">✅ Solución Óptima Encontrada</div>
                        <div class="solution-value">Valor óptimo: ${solution.optimalValue.toFixed(4)}</div>
                        <div class="solution-variables">
                            <div class="variable-value">
                                <div class="variable-name">x</div>
                                <div class="variable-number">${solution.variables.x.toFixed(4)}</div>
                            </div>
                            <div class="variable-value">
                                <div class="variable-name">y</div>
                                <div class="variable-number">${solution.variables.y.toFixed(4)}</div>
                            </div>
                        </div>
                        <div class="steps-section">
                            <div class="steps-title">📋 Información adicional:</div>
                            <div class="step">Punto óptimo: (${solution.variables.x.toFixed(4)}, ${solution.variables.y.toFixed(4)})</div>
                            <div class="step">Vértices evaluados: ${solution.vertices.length}</div>
                            <div class="step">Región factible sombreada en GeoGebra</div>
                            <div class="step">Método: Algoritmo Simplex (método gráfico)</div>
                        </div>
                    </div>
                `;
            } else if (solution.status === 'infeasible') {
                outputDiv.innerHTML = `
                    <div class="solution-result infeasible">
                        <div class="solution-header">❌ Problema No Factible</div>
                        <p>${solution.message}</p>
                    </div>
                `;
            } else if (solution.status === 'unbounded') {
                outputDiv.innerHTML = `
                    <div class="solution-result unbounded">
                        <div class="solution-header">⚠️ Problema No Acotado</div>
                        <p>La función objetivo puede crecer indefinidamente.</p>
                    </div>
                `;
            }
        }

        // Función principal para graficar en GeoGebra con sombreado
        function plotInGeoGebra(objective, constraints, solution, isMaximize, nonNegative) {
            if (!ggbApp) return;

            // Limpiar objetos anteriores
            ggbApp.deleteObject("*");

            let constraintIndex = 0;

            // Dibujar restricciones con sombreado
            constraints.forEach((constraint, index) => {
                const coeffs = parseLinearExpression(constraint.left);
                const color = constraintColors[index % constraintColors.length];
                
                // Crear la línea de la restricción
                const lineCommand = createLineCommand(coeffs.x, coeffs.y, constraint.right, `line${index}`);
                ggbApp.evalCommand(lineCommand);
                ggbApp.setColor(`line${index}`, ...hexToRgb(color));
                ggbApp.setLineThickness(`line${index}`, 3);

                // Crear región sombreada según el tipo de restricción
                createShadedRegion(coeffs, constraint.operator, constraint.right, index, color);
                constraintIndex++;
            });

            // Agregar restricciones de no negatividad con sombreado
            if (nonNegative) {
                // x >= 0
                ggbApp.evalCommand(`x_axis: x = 0`);
                ggbApp.setColor('x_axis', 200, 200, 200);
                ggbApp.setLineStyle('x_axis', 1);
                
                // y >= 0  
                ggbApp.evalCommand(`y_axis: y = 0`);
                ggbApp.setColor('y_axis', 200, 200, 200);
                ggbApp.setLineStyle('y_axis', 1);

                // Sombrear región x >= 0 (lado derecho del eje Y)
                ggbApp.evalCommand(`region_x_pos: x >= 0 ∧ x <= 20 ∧ y >= -10 ∧ y <= 20`);
                ggbApp.setColor('region_x_pos', 100, 100, 100);
                ggbApp.setFilling('region_x_pos', 0.1);

                // Sombrear región y >= 0 (lado superior del eje X)
                ggbApp.evalCommand(`region_y_pos: y >= 0 ∧ x >= -10 ∧ x <= 20 ∧ y <= 20`);
                ggbApp.setColor('region_y_pos', 100, 100, 100);
                ggbApp.setFilling('region_y_pos', 0.1);
            }

            // Si hay solución óptima, dibujar elementos adicionales
            if (solution.status === 'optimal') {
                // Dibujar vértices
                solution.vertices.forEach((vertex, index) => {
                    ggbApp.evalCommand(`vertex${index}: (${vertex.x}, ${vertex.y})`);
                    ggbApp.setPointSize(`vertex${index}`, 4);
                    ggbApp.setColor(`vertex${index}`, 70, 130, 180);
                });

                // Destacar punto óptimo
                const optPoint = solution.variables;
                ggbApp.evalCommand(`optimal_point: (${optPoint.x}, ${optPoint.y})`);
                ggbApp.setPointSize('optimal_point', 6);
                ggbApp.setColor('optimal_point', 56, 161, 105);
                ggbApp.setCaption('optimal_point', 'Óptimo');

                // Dibujar línea de función objetivo en el punto óptimo
                const objCoeffs = parseLinearExpression(objective);
                const objValue = isMaximize ? solution.optimalValue : -solution.optimalValue;
                const objLineCommand = createLineCommand(objCoeffs.x, objCoeffs.y, objValue, 'objective_line');
                ggbApp.evalCommand(objLineCommand);
                ggbApp.setColor('objective_line', 229, 62, 62);
                ggbApp.setLineThickness('objective_line', 4);
                ggbApp.setLineStyle('objective_line', 2); // Línea punteada

                // Crear región factible combinada (intersección de todas las restricciones)
                createFeasibleRegion(constraints, nonNegative);
            }

            // Ajustar vista
            setTimeout(() => {
                zoomToFit();
            }, 500);
        }

        // Crear comando de línea para GeoGebra
        function createLineCommand(a, b, c, name) {
            if (Math.abs(b) > 1e-10) {
                // ax + by = c -> y = (c - ax) / b
                const slope = -a / b;
                const yIntercept = c / b;
                return `${name}: y = ${slope} * x + ${yIntercept}`;
            } else if (Math.abs(a) > 1e-10) {
                // ax = c -> x = c/a (línea vertical)
                const xValue = c / a;
                return `${name}: x = ${xValue}`;
            } else {
                // Caso degenerado
                return `${name}: y = 0`;
            }
        }

        // Crear región sombreada según el operador de restricción
        function createShadedRegion(coeffs, operator, rhs, index, color) {
            const rgb = hexToRgb(color);
            let regionCommand = '';

            if (Math.abs(coeffs.y) > 1e-10) {
                // Forma general: ax + by [operator] c
                if (operator === '<=') {
                    regionCommand = `region${index}: ${coeffs.x} * x + ${coeffs.y} * y <= ${rhs} ∧ x >= -10 ∧ x <= 20 ∧ y >= -10 ∧ y <= 20`;
                } else if (operator === '>=') {
                    regionCommand = `region${index}: ${coeffs.x} * x + ${coeffs.y} * y >= ${rhs} ∧ x >= -10 ∧ x <= 20 ∧ y >= -10 ∧ y <= 20`;
                } else { // operator === '='
                    // Para igualdades, no sombreamos (solo la línea)
                    return;
                }
            } else if (Math.abs(coeffs.x) > 1e-10) {
                // Línea vertical: ax = c
                const xValue = rhs / coeffs.x;
                if (operator === '<=') {
                    regionCommand = `region${index}: x <= ${xValue} ∧ x >= -10 ∧ y >= -10 ∧ y <= 20`;
                } else if (operator === '>=') {
                    regionCommand = `region${index}: x >= ${xValue} ∧ x <= 20 ∧ y >= -10 ∧ y <= 20`;
                } else {
                    return;
                }
            }

            if (regionCommand) {
                ggbApp.evalCommand(regionCommand);
                ggbApp.setColor(`region${index}`, rgb[0], rgb[1], rgb[2]);
                ggbApp.setFilling(`region${index}`, 0.15);
            }
        }

        // Crear la región factible (intersección de todas las restricciones)
        function createFeasibleRegion(constraints, nonNegative) {
            let feasibleCommand = 'feasible_region: ';
            const conditions = [];

            // Agregar condiciones de restricciones
            constraints.forEach((constraint, index) => {
                const coeffs = parseLinearExpression(constraint.left);
                const condition = `${coeffs.x} * x + ${coeffs.y} * y ${constraint.operator} ${constraint.right}`;
                conditions.push(condition);
            });

            // Agregar restricciones de no negatividad
            if (nonNegative) {
                conditions.push('x >= 0');
                conditions.push('y >= 0');
            }

            // Límites de vista para evitar regiones infinitas
            conditions.push('x >= -2');
            conditions.push('x <= 15');
            conditions.push('y >= -2');
            conditions.push('y <= 15');

            feasibleCommand += conditions.join(' ∧ ');

            try {
                ggbApp.evalCommand(feasibleCommand);
                ggbApp.setColor('feasible_region', 79, 172, 254);
                ggbApp.setFilling('feasible_region', 0.3);
            } catch (error) {
                console.warn('No se pudo crear la región factible combinada:', error);
            }
        }

        // Convertir color hex a RGB
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] : [128, 128, 128];
        }

        // Funciones de control de GeoGebra
        function resetView() {
            if (ggbApp) {
                ggbApp.setCoordSystem(-2, 12, -2, 10);
            }
        }

        function toggleGrid() {
            if (ggbApp) {
                const currentState = ggbApp.getGridVisible();
                ggbApp.showGrid(!currentState);
            }
        }

        function toggleAxes() {
            if (ggbApp) {
                const xVisible = ggbApp.getAxisVisible(0);
                const yVisible = ggbApp.getAxisVisible(1);
                ggbApp.showAxes(!xVisible, !yVisible);
            }
        }

        function zoomToFit() {
            if (ggbApp && currentSolution && currentSolution.vertices && currentSolution.vertices.length > 0) {
                // Calcular límites basados en los vértices
                let minX = Math.min(...currentSolution.vertices.map(v => v.x));
                let maxX = Math.max(...currentSolution.vertices.map(v => v.x));
                let minY = Math.min(...currentSolution.vertices.map(v => v.y));
                let maxY = Math.max(...currentSolution.vertices.map(v => v.y));

                // Agregar margen
                const marginX = (maxX - minX) * 0.2;
                const marginY = (maxY - minY) * 0.2;

                minX = Math.max(minX - marginX, -5);
                maxX = Math.min(maxX + marginX, 20);
                minY = Math.max(minY - marginY, -5);
                maxY = Math.min(maxY + marginY, 15);

                ggbApp.setCoordSystem(minX, maxX, minY, maxY);
            } else {
                resetView();
            }
        }

        // Función para cargar ejemplo predefinido
        function loadExample() {
            document.getElementById('objective').value = '3x + 2y';
            document.querySelector('input[value="maximize"]').checked = true;
            
            const container = document.getElementById('constraints-container');
            container.innerHTML = `
                <div class="constraint-row">
                    <input type="text" placeholder="2x + y" class="constraint-left" value="2x + y">
                    <select class="constraint-operator">
                        <option value="<=" selected>&le;</option>
                        <option value=">=">&ge;</option>
                        <option value="=">=</option>
                    </select>
                    <input type="number" placeholder="10" class="constraint-right" value="10">
                    <button type="button" class="btn-remove" onclick="removeConstraint(this)">✕</button>
                </div>
                <div class="constraint-row">
                    <input type="text" placeholder="x + 2y" class="constraint-left" value="x + 2y">
                    <select class="constraint-operator">
                        <option value="<=" selected>&le;</option>
                        <option value=">=">&ge;</option>
                        <option value="=">=</option>
                    </select>
                    <input type="number" placeholder="8" class="constraint-right" value="8">
                    <button type="button" class="btn-remove" onclick="removeConstraint(this)">✕</button>
                </div>
            `;
            
            document.getElementById('non-negative').checked = true;
        }

        // Función para validar entrada
        function validateInput(input) {
            // Permitir solo caracteres matemáticos válidos
            const validPattern = /^[0-9xy+\-.\s]*$/;
            return validPattern.test(input);
        }

        // Eventos de validación en tiempo real
        document.addEventListener('DOMContentLoaded', function() {
            // Inicializar GeoGebra
            initGeoGebra();

            // Validar campos de función objetivo
            document.getElementById('objective').addEventListener('input', function(e) {
                if (!validateInput(e.target.value)) {
                    e.target.style.borderColor = '#e53e3e';
                } else {
                    e.target.style.borderColor = 'rgba(74, 85, 104, 0.5)';
                }
            });

            // Cargar ejemplo inicial
            setTimeout(() => {
                loadExample();
            }, 1000);

            // Configurar eventos de teclado
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    solveProblem();
                }
            });
        });

        // Funciones adicionales para mejor experiencia de usuario
        function exportSolutionImage() {
            if (ggbApp) {
                const imageData = ggbApp.getPNGBase64(1, true, 72);
                const link = document.createElement('a');
                link.download = 'solucion_programacion_lineal.png';
                link.href = 'data:image/png;base64,' + imageData;
                link.click();
            }
        }

        function copyGeoGebraCommands() {
            if (!ggbApp) return;
            
            let commands = [];
            const objectNames = ggbApp.getAllObjectNames();
            
            for (let name of objectNames) {
                const command = ggbApp.getCommandString(name);
                if (command) {
                    commands.push(command);
                }
            }
            
            const commandText = commands.join('\n');
            navigator.clipboard.writeText(commandText).then(() => {
                alert('Comandos de GeoGebra copiados al portapapeles');
            });
        }

        // Agregar funciones avanzadas de análisis
        function performSensitivityAnalysis() {
            if (!currentSolution || currentSolution.status !== 'optimal') {
                alert('Primero resuelve un problema para realizar análisis de sensibilidad');
                return;
            }

            const analysis = {
                optimalPoint: currentSolution.variables,
                optimalValue: currentSolution.optimalValue,
                activeConstraints: [],
                shadowPrices: []
            };

            // Identificar restricciones activas
            const constraints = currentSolution.constraints;
            const optPoint = currentSolution.variables;

            constraints.forEach((constraint, index) => {
                const value = constraint.x * optPoint.x + constraint.y * optPoint.y;
                const tolerance = 1e-6;

                if (Math.abs(value - constraint.rhs) < tolerance) {
                    analysis.activeConstraints.push({
                        index: index,
                        constraint: constraint,
                        type: 'activa'
                    });
                }
            });

            // Mostrar análisis
            const analysisHtml = `
                <div class="steps-section" style="margin-top: 20px;">
                    <div class="steps-title">📊 Análisis de Sensibilidad:</div>
                    <div class="step">Punto óptimo: (${optPoint.x.toFixed(4)}, ${optPoint.y.toFixed(4)})</div>
                    <div class="step">Valor óptimo: ${currentSolution.optimalValue.toFixed(4)}</div>
                    <div class="step">Restricciones activas: ${analysis.activeConstraints.length}</div>
                    ${analysis.activeConstraints.map(ac => 
                        `<div class="step">• Restricción ${ac.index + 1}: ${ac.constraint.x}x + ${ac.constraint.y}y = ${ac.constraint.rhs}</div>`
                    ).join('')}
                </div>
            `;

            document.getElementById('solution-output').innerHTML += analysisHtml;
        }

        // Funciones de utilidad para debugging
        window.ggbDebug = {
            listObjects: () => {
                if (ggbApp) {
                    console.log('Objetos en GeoGebra:', ggbApp.getAllObjectNames());
                }
            },
            getObjectInfo: (name) => {
                if (ggbApp && name) {
                    console.log(`Información de ${name}:`, {
                        definition: ggbApp.getDefinitionString(name),
                        command: ggbApp.getCommandString(name),
                        value: ggbApp.getValueString(name)
                    });
                }
            }
        };

        console.log("🎯 Solucionador con GeoGebra cargado. Usa window.ggbDebug para debugging.");

