// define some constants to use in the APP.
const r2=0.70710678118;
const pi=Math.PI;
// Define the Quantum Circuit
class Qcircuit {
    constructor(Qubits){
        if (Qubits == 0 ){
            console.error("Number of Qbits need to ne more than 0");
        } 
        this.Qubits = Qubits;
        this.Bits = Qubits;
        this.circuit = [];
    }

    addgate(gate){
        this.circuit.push(gate);
    }

    x(q){ this.addgate(['x',q]);}

    rx(q, theta){ this.addgate(['rx',q, theta]);}

    ry(q, theta){
        this.rx(q,pi/2);
        this.h(q);
        this.rx(q,theta);
        this.h(q);
        this.rx(q,-pi/2);
    }

    rz(q, theta){
        this.h(q);
        this.rx(q,theta);
        this.h(q);
    }

    z(q){ this.rz(q,pi)}

    y(q){
        this.rz(q,pi);
        this.x(q)
    }

    h(q){ this.addgate(['h',q]); }
    
    cx(q,t){ this.addgate(['cx',q,t]); }

    m(q,t){ this.addgate(['m',q,t]); }
}

class Qsimulator{
    constructor(qcircuit){
        this.circuit = qcircuit.circuit;
        this.Qubits =  qcircuit.Qubits;
        this.Bits =  this.Qubits;
        this.statevector = [];
    }

    statevector2str(){
        let output = "";
        this.statevector.forEach((value, index) => {
            let bits = index.toString(2).padStart(this.Qubits, '0');
            output += bits +' '+ value[0].toString()+'+'+value[1].toString() +'j\n';
        })
        return output;
    }

    probability(shots){
        let probabilities = []
        this.statevector.forEach((value, index) =>{
            let realPart = value[0];
            let imaginatyPart = value[1];
            probabilities.push(Math.pow(realPart,2)+Math.pow(imaginatyPart,2))
        })

        let output = []
        for(let shotscount=0; shotscount < shots;shotscount++){
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

    initializeStatevector(){
        this.statevector = new Array(Math.pow(2,this.Qubits)).fill([0.0,0.0]);
        this.statevector[0]=[1.0,0.0];
    }

    run(format, shots){
        
        format = format || "statevector";
        shots = shots || 1024;

        this.initializeStatevector();

        this.circuit.forEach((value)=>{
            let gate = value[0];
            if (['x','h','rx'].includes(gate)){
                let qubit = value[1];

                for(let contQubit=0; contQubit < Math.pow(2,qubit); contQubit++){
                    for(let contState=0; contState < Math.pow(2,this.Qubits-qubit-1); contState++){
                        let b0=contQubit+Math.pow(2,qubit+1)*contState;
                        let b1=b0+Math.pow(2,qubit);
                        if(gate == 'x'){
                            let temp = this.statevector[b0]
                            this.statevector[b0] = this.statevector[b1]
                            this.statevector[b1] = temp
                        }
                        if(gate == 'h') {
                            let supepositionResult = this.superpose(this.statevector[b0],this.statevector[b1]);
                            this.statevector[b0] = supepositionResult[0];
                            this.statevector[b1] = supepositionResult[1];
                        }
                        if(gate == 'rx'){
                            let theta = value[2];
                            let turn = this.turn(this.statevector[b0],this.statevector[b1],theta);
                            this.statevector[b0] = turn[0];
                            this.statevector[b1] = turn[1];
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

                                let temp = this.statevector[b0]
                                this.statevector[b0] = this.statevector[b1];
                                this.statevector[b1] = temp;
                            }
                        }
                    }     
                }
            }
        });
    
        if (format == 'statevector'){
            return this.statevector2str();
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
            console.log('error: Valid output format [statevector, counts, memory]')
        }
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
};

// test
function test(){
    qc = new Qcircuit(5)
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
    qsimulator = new Qsimulator(qc)
    statevector = qsimulator.run("statevector")
    console.log(statevector)
    result = qsimulator.run("counts", 1024)
    console.log(result)
}
