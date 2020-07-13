// define some constants to use in the APP.
const r2=0.70710678118;
const pi=Math.PI;
// Define the Quantum Circuit
class QuantumCircuit {
    constructor(Qubits){
        if (Qubits == 0 ){
            console.error("Number of Qubits need to ne more than 0");
        } 
        this.Qubits = Qubits;
        this.Bits = Qubits;
        this.circuit = [];
    }

    addGate(gate){
        this.circuit.push(gate);
    }

    x(qubit){ this.addGate(['x',qubit]);}

    rx(qubit, theta){ this.addGate(['rx',qubit, theta]);}

    ry(qubit, theta){
        this.rx(qubit,pi/2);
        this.h(qubit);
        this.rx(qubit,theta);
        this.h(qubit);
        this.rx(qubit,-pi/2);
    }

    rz(qubit, theta){
        this.h(qubit);
        this.rx(qubit,theta);
        this.h(qubit);
    }

    z(qubit){ this.rz(qubit,pi) }

    y(qubit){
        this.rz(qubit,pi);
        this.x(qubit)
    }

    h(qubit){ this.addGate(['h',qubit]); }
    
    cx(qubit,target){ this.addGate(['cx',qubit,target]); }

    m(qubit,target){ this.addGate(['m',qubit,target]); }
}

class QuantumSimulator{
    constructor(quantumCircuit){
        this.circuit = quantumCircuit.circuit;
        this.Qubits =  quantumCircuit.Qubits;
        this.Bits =  this.Qubits;
        this.stateVector = [];
    }

    initializeStateVector(){
        this.stateVector = new Array(Math.pow(2,this.Qubits)).fill([0.0,0.0]);
        this.stateVector[0]=[1.0,0.0];
    }

    probability(shots){
        let probabilities = []
        this.stateVector.forEach((value, index) =>{
            let realPart = value[0];
            let imaginaryPart = value[1];
            probabilities.push(Math.pow(realPart,2)+Math.pow(imaginaryPart,2))
        })

        let output = []
        for(let shotsCount=0; shotsCount < shots;shotsCount++){
            let cumu =0
            let un= true
            let r = Math.random()
            probabilities.forEach((value, index)=>{
                cumu+=value
                if(r < cumu && un){
                    let raw_output = index.toString(2).padStart(this.Qubits, '0');
                    output.push(raw_output)
                    un=false;
                }
            })
        }
        return output;
    }

    stateVector2str(){
        let output = "";
        this.stateVector.forEach((value, index) => {
            let bits = index.toString(2).padStart(this.Qubits, '0');
            output += bits +' '+ value[0].toString()+'+'+value[1].toString() +'j\n';
        })
        return output;
    }

    superpose(x,y){
        return [[r2*(x[0]+y[0]),r2*(x[1]+y[1])],
                [r2*(x[0]-y[0]),r2*(x[1]-y[1])]];
    };

    turn(x,y,theta){
        let part1 = [x[0]*Math.cos(theta/2)+y[1]*Math.sin(theta/2),x[1]*Math.cos(theta/2)-y[0]*Math.sin(theta/2)]
        let part2 = [y[0]*Math.cos(theta/2)+x[1]*Math.sin(theta/2),y[1]*Math.cos(theta/2)-x[0]*Math.sin(theta/2)]
        return [ part1, part2]
    };

    run(format, shots){
        
        format = format || "statevector";
        shots = shots || 1024;

        this.initializeStateVector();

        this.circuit.forEach((value)=>{
            let gate = value[0];
            if (['x','h','rx'].includes(gate)){
                let qubit = value[1];

                for(let contQubit=0; contQubit < Math.pow(2,qubit); contQubit++){
                    for(let contState=0; contState < Math.pow(2,this.Qubits-qubit-1); contState++){
                        let b0=contQubit+Math.pow(2,qubit+1)*contState;
                        let b1=b0+Math.pow(2,qubit);
                        if(gate == 'x'){
                            let temp = this.stateVector[b0]
                            this.stateVector[b0] = this.stateVector[b1]
                            this.stateVector[b1] = temp
                        }
                        if(gate == 'h') {
                            let superpositionResult = this.superpose(this.stateVector[b0],this.stateVector[b1]);
                            this.stateVector[b0] = superpositionResult[0];
                            this.stateVector[b1] = superpositionResult[1];
                        }
                        if(gate == 'rx'){
                            let theta = value[2];
                            let turn = this.turn(this.stateVector[b0],this.stateVector[b1],theta);
                            this.stateVector[b0] = turn[0];
                            this.stateVector[b1] = turn[1];
                        }
                    }   
                }
            }else{
                if(gate == 'cx'){
                    let control = value[2];
                    let target = value[1];
                    let loopLimit = [];
                    if(target<control){
                        loopLimit[0] = target;
                        loopLimit[1] = control;
                    } else {
                        loopLimit[1] = target;
                        loopLimit[0] = control;
                    }
                    for(let cx0=0;cx0<Math.pow(2,loopLimit[0]);cx0++){
                        for(let cx1=0;cx1<Math.pow(2,loopLimit[0]-loopLimit[1]-1);cx1++){
                            for(let cx2=0;cx2<Math.pow(2,this.Qubits-loopLimit[1]-1);cx2++){
                                let b0 =    cx0 + 
                                            Math.pow(2,loopLimit[0]+1)*cx1 +
                                            Math.pow(2,loopLimit[1]+1)*cx2 + 
                                            Math.pow(2,control);

                                let b1 = b0 + Math.pow(2,target)

                                let temp = this.stateVector[b0]
                                this.stateVector[b0] = this.stateVector[b1];
                                this.stateVector[b1] = temp;
                            }
                        }
                    }     
                }
            }
        });
    
        if (format == 'statevector'){
            return this.stateVector2str();
        } else if (format == 'memory'){
            return this.probability(shots);
        } else if(format == 'counts'){
            let probabilities = this.probability(shots);
            let counts = {};
            probabilities.forEach((value, index)=>{
                if(value in counts){
                    counts[value]+=1;
                } else {
                    counts[value]=1;
                }
            });
            const orderedCounts = {};
            Object.keys(counts).sort().forEach(function(key) {
                orderedCounts[key] = counts[key];
            });
            return orderedCounts;
        }else{
            console.log('error: Valid output format [state vector, counts, memory]')
        }
    }

};

// test
function test(){
    qc = new QuantumCircuit(5)
    qc.x(0);
    qc.rx(0,2);
    qc.x(1)
    qc.x(0)
    qc.x(2)
    qc.z(0)
    qc.x(0)
    
    qc.h(2)
    qc.h(0)
    qc.h(1)
    
    qc.cx(0,1);
    qc.cx(0,1);
    qc.m(0,0);
    
    console.log(qc.circuit);
    
    // Execute
    // result = qc.execute(1024,"counts")
    quantumSimulator = new QuantumSimulator(qc)
    stateVector = quantumSimulator.run("statevector")
    console.log(stateVector)
    result = quantumSimulator.run("counts", 1024)
    console.log(result)
}

test()