let chart = null;

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
                <button type="button" class="btn-remove" onclick="removeConstraint(this)">?</button>
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
                    <button type="button" class="btn-remove" onclick="removeConstraint(this)">?</button>
                </div>
            `;
            document.getElementById('solution-output').innerHTML = `
                <div class="placeholder">
                    <p>Configura tu problema y presiona "Resolver" para ver los resultados</p>
                </div>
            `;
            if (chart) {
                chart.destroy();
                chart = null;
            }
        }

        // Función principal para resolver el problema
        function solveProblem() {
            try {
                const objective = document.getElementById('objective').value.trim();
                const isMaximize = document.querySelector('input[name="optimization"]:checked').value === 'maximize';
                const nonNegative = document.getElementById('non-negative').checked;

                if (!objective) {
                    showError('Por favor, ingresa la funcion objetivo.');
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
                    showError('Por favor, agrega al menos una restriccion.');
                    return;
                }

                // Resolver usando método simplex simplificado
                const solution = solveSimplex(objective, constraints, isMaximize, nonNegative);
                displaySolution(solution);
                plotGraph(objective, constraints, solution, isMaximize);

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
                return { status: 'infeasible', message: 'El problema no tiene solucion factible.' };
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
                vertices: vertices
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
                        <div class="solution-header">Solucion Optima Encontrada</div>
                        <div class="solution-value">Valor optimo: ${solution.optimalValue.toFixed(4)}</div>
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
                            <div class="steps-title">Informacion adicional:</div>
                            <div class="step">Punto optimo: (${solution.variables.x.toFixed(4)}, ${solution.variables.y.toFixed(4)})</div>
                            <div class="step">Vertices evaluados: ${solution.vertices.length}</div>
                            <div class="step">Metodo utilizado: Algoritmo Simplex (metodo grafico)</div>
                        </div>
                    </div>
                `;
            } else if (solution.status === 'infeasible') {
                outputDiv.innerHTML = `
                    <div class="solution-result infeasible">
                        <div class="solution-header">? Problema No Factible</div>
                        <p>${solution.message}</p>
                    </div>
                `;
            } else if (solution.status === 'unbounded') {
                outputDiv.innerHTML = `
                    <div class="solution-result unbounded">
                        <div class="solution-header">Problema No Acotado</div>
                        <p>La funcion objetivo puede crecer indefinidamente.</p>
                    </div>
                `;
            }
        }

        // Graficar la región factible y la solución
        function plotGraph(objective, constraints, solution, isMaximize) {
            const ctx = document.getElementById('feasibilityChart').getContext('2d');
            
            if (chart) {
                chart.destroy();
            }

            // Preparar datos para el gráfico
            const datasets = [];
            
            // Agregar líneas de restricciones
            constraints.forEach((constraint, index) => {
                const points = generateConstraintLine(constraint, -10, 10);
                datasets.push({
                    label: `${constraint.left} ${constraint.operator} ${constraint.right}`,
                    data: points,
                    borderColor: `hsl(${index * 60}, 70%, 50%)`,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0
                });
            });

            // Agregar función objetivo
            if (solution.status === 'optimal') {
                const objCoeffs = parseLinearExpression(objective);
                const objectivePoints = generateObjectiveLine(objCoeffs, solution.optimalValue, -10, 10);
                datasets.push({
                    label: `Función objetivo: ${objective}`,
                    data: objectivePoints,
                    borderColor: '#e53e3e',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0
                });

                // Punto óptimo
                datasets.push({
                    label: 'Punto Optimo',
                    data: [{ x: solution.variables.x, y: solution.variables.y }],
                    backgroundColor: '#38a169',
                    borderColor: '#2f855a',
                    borderWidth: 3,
                    pointRadius: 8,
                    showLine: false
                });

                // Vértices
                datasets.push({
                    label: 'Vertices',
                    data: solution.vertices,
                    backgroundColor: '#3182ce',
                    borderColor: '#2c5aa0',
                    borderWidth: 2,
                    pointRadius: 5,
                    showLine: false
                });
            }

            chart = new Chart(ctx, {
                type: 'scatter',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Region Factible y Solucion Optima'
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'center',
                            title: { display: true, text: 'x' },
                            grid: { display: true }
                        },
                        y: {
                            type: 'linear',
                            position: 'center',
                            title: { display: true, text: 'y' },
                            grid: { display: true }
                        }
                    },
                    interaction: {
                        intersect: false
                    }
                }
            });
        }

        // Generar puntos para línea de restricción
        function generateConstraintLine(constraint, xMin, xMax) {
            const points = [];
            const coeffs = parseLinearExpression(constraint.left);
            
            if (Math.abs(coeffs.y) > 1e-10) {
                // y = (rhs - ax) / b
                for (let x = xMin; x <= xMax; x += 0.5) {
                    const y = (constraint.right - coeffs.x * x) / coeffs.y;
                    if (y >= -10 && y <= 10) {
                        points.push({ x, y });
                    }
                }
            } else if (Math.abs(coeffs.x) > 1e-10) {
                // Línea vertical: x = rhs / a
                const x = constraint.right / coeffs.x;
                if (x >= xMin && x <= xMax) {
                    points.push({ x, y: -10 });
                    points.push({ x, y: 10 });
                }
            }
            
            return points;
        }

        // Generar puntos para línea de función objetivo
        function generateObjectiveLine(objCoeffs, optimalValue, xMin, xMax) {
            const points = [];
            
            if (Math.abs(objCoeffs.y) > 1e-10) {
                // y = (optimalValue - cx) / d
                for (let x = xMin; x <= xMax; x += 0.5) {
                    const y = (optimalValue - objCoeffs.x * x) / objCoeffs.y;
                    if (y >= -10 && y <= 10) {
                        points.push({ x, y });
                    }
                }
            } else if (Math.abs(objCoeffs.x) > 1e-10) {
                // Línea vertical: x = optimalValue / c
                const x = optimalValue / objCoeffs.x;
                if (x >= xMin && x <= xMax) {
                    points.push({ x, y: -10 });
                    points.push({ x, y: 10 });
                }
            }
            
            return points;
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
                    <button type="button" class="btn-remove" onclick="removeConstraint(this)">?</button>
                </div>
                <div class="constraint-row">
                    <input type="text" placeholder="x + 2y" class="constraint-left" value="x + 2y">
                    <select class="constraint-operator">
                        <option value="<=" selected>&le;</option>
                        <option value=">=">&ge;</option>
                        <option value="=">=</option>
                    </select>
                    <input type="number" placeholder="8" class="constraint-right" value="8">
                    <button type="button" class="btn-remove" onclick="removeConstraint(this)">?</button>
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
            // Validar campos de función objetivo
            document.getElementById('objective').addEventListener('input', function(e) {
                if (!validateInput(e.target.value)) {
                    e.target.style.borderColor = '#e53e3e';
                } else {
                    e.target.style.borderColor = '#e2e8f0';
                }
            });

            // Cargar ejemplo inicial
            loadExample();
        });

        // Función mejorada para el análisis de sensibilidad
        function performSensitivityAnalysis(objective, constraints, solution) {
            if (solution.status !== 'optimal') return null;

            const analysis = {
                objectiveChanges: [],
                rhsChanges: []
            };

            const objCoeffs = parseLinearExpression(objective);
            
            // Análisis de cambios en coeficientes de función objetivo
            const deltaC = 0.1;
            for (let variable of ['x', 'y']) {
                const originalCoeff = objCoeffs[variable];
                
                // Incrementar coeficiente
                objCoeffs[variable] = originalCoeff + deltaC;
                const newObjective = `${objCoeffs.x}x + ${objCoeffs.y}y`;
                const newSolution = solveSimplex(newObjective, constraints, true, true);
                
                if (newSolution.status === 'optimal') {
                    analysis.objectiveChanges.push({
                        variable: variable,
                        change: deltaC,
                        newValue: newSolution.optimalValue,
                        sensitivity: (newSolution.optimalValue - solution.optimalValue) / deltaC
                    });
                }
                
                // Restaurar valor original
                objCoeffs[variable] = originalCoeff;
            }

            return analysis;
        }

        // Función para exportar resultados
        function exportResults() {
            const objective = document.getElementById('objective').value;
            const isMaximize = document.querySelector('input[name="optimization"]:checked').value === 'maximize';
            
            const exportData = {
                problema: {
                    funcionObjetivo: objective,
                    tipoOptimizacion: isMaximize ? 'Maximizar' : 'Minimizar',
                    restricciones: [],
                    noNegativas: document.getElementById('non-negative').checked
                },
                solucion: JSON.parse(document.getElementById('solution-output').textContent || '{}'),
                timestamp: new Date().toISOString()
            };

            // Recopilar restricciones
            const constraintRows = document.querySelectorAll('.constraint-row');
            constraintRows.forEach(row => {
                const left = row.querySelector('.constraint-left').value.trim();
                const operator = row.querySelector('.constraint-operator').value;
                const right = row.querySelector('.constraint-right').value;
                
                if (left && right) {
                    exportData.problema.restricciones.push(`${left} ${operator} ${right}`);
                }
            });

            // Crear archivo de descarga
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `solucion_IO_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // Función para importar problema
        function importProblem(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Cargar datos del problema
                    if (data.problema) {
                        document.getElementById('objective').value = data.problema.funcionObjetivo || '';
                        
                        const optimizationType = data.problema.tipoOptimizacion === 'Maximizar' ? 'maximize' : 'minimize';
                        document.querySelector(`input[value="${optimizationType}"]`).checked = true;
                        
                        document.getElementById('non-negative').checked = data.problema.noNegativas || false;
                        
                        // Cargar restricciones
                        if (data.problema.restricciones && data.problema.restricciones.length > 0) {
                            const container = document.getElementById('constraints-container');
                            container.innerHTML = '';
                            
                            data.problema.restricciones.forEach(restriccion => {
                                const parts = restriccion.split(/(\<=|\>=|=)/);
                                if (parts.length >= 3) {
                                    const constraintRow = document.createElement('div');
                                    constraintRow.className = 'constraint-row';
                                    constraintRow.innerHTML = `
                                        <input type="text" class="constraint-left" value="${parts[0].trim()}">
                                        <select class="constraint-operator">
                                            <option value="<=" ${parts[1] === '<=' ? 'selected' : ''}>&le;</option>
                                            <option value=">=" ${parts[1] === '>=' ? 'selected' : ''}>&ge;</option>
                                            <option value="=" ${parts[1] === '=' ? 'selected' : ''}>=</option>
                                        </select>
                                        <input type="number" class="constraint-right" value="${parts[2].trim()}">
                                        <button type="button" class="btn-remove" onclick="removeConstraint(this)">?</button>
                                    `;
                                    container.appendChild(constraintRow);
                                }
                            });
                        }
                    }
                    
                    alert('Problema importado exitosamente');
                } catch (error) {
                    alert('Error al importar el archivo: ' + error.message);
                }
            };
            reader.readAsText(file);
        }

        // Inicializar la aplicación cuando se carga la página
        window.addEventListener('load', function() {
            console.log('Solucionador de Investigacion Operativa cargado exitosamente');
            
            // Agregar tooltips informativos
            addTooltips();
            
            // Configurar eventos de teclado para resolver con Enter
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    solveProblem();
                }
            });
        });

        // Función para agregar tooltips
        function addTooltips() {
            const elements = [
                { id: 'objective', text: 'Ejemplo: 3x + 2y (usa x e y como variables)' },
                { class: 'constraint-left', text: 'Ejemplo: 2x + y (lado izquierdo de la restricción)' },
                { class: 'btn-solve', text: 'Presiona Ctrl+Enter para resolver rápidamente' }
            ];

            elements.forEach(el => {
                const targets = el.id ? [document.getElementById(el.id)] : document.querySelectorAll(`.${el.class}`);
                targets.forEach(target => {
                    if (target) {
                        target.title = el.text;
                    }
                });
            });
        }

        // Función para detectar problemas comunes
        function detectCommonIssues(objective, constraints) {
            const issues = [];
            
            // Verificar si la función objetivo está vacía
            if (!objective.trim()) {
                issues.push('La funcion objetivo no puede estar vacia');
            }
            
            // Verificar si hay variables no reconocidas
            const validVariables = /^[0-9xy+\-.\s]*$/;
            if (!validVariables.test(objective)) {
                issues.push('La funcion objetivo contiene caracteres no validos. Use solo x, y, números y operadores +, -');
            }
            
            // Verificar restricciones inconsistentes
            const objCoeffs = parseLinearExpression(objective);
            if (objCoeffs.x === 0 && objCoeffs.y === 0) {
                issues.push('La funcion objetivo debe tener al menos una variable con coeficiente no nulo');
            }
            
            return issues;
        }
