class Serialization {
    constructor(scanCounts, accumulativeErrorThreshold, repeatErrorThreshold) {
        this.scanCounts = scanCounts;
        this.accumulativeErrorThreshold = accumulativeErrorThreshold;
        this.repeatErrorThreshold = repeatErrorThreshold;
        this.window = [];
        this.errorCount = 0;
        this.repeatErrorCount = 0;
    }

    checkFormat(data) {
        const identifikasi_pattern = /^\(90\)[A-Za-z0-9]{1,16}\(91\)\d{1,10}$/;
        const otentifikasi_pattern1 = /^\(90\)[A-Za-z0-9]{1,16}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)\d{1,10}$/;
        const otentifikasi_pattern2 = /^\(01\)[A-Za-z0-9]{14}\(10\)[A-Za-z0-9]{1,20}\(17\)\d{1,6}\(21\)\d{1,10}$/;

        if (identifikasi_pattern.test(data) || otentifikasi_pattern1.test(data) || otentifikasi_pattern2.test(data)) {
            console.log("Data is in correct format:", data);
        } else {
            console.log("Data is in bad format:", data);
            this.errorCount++;
            if (this.errorCount >= this.accumulativeErrorThreshold * this.scanCounts) {
                console.log(`Accumulative error threshold reached: ${this.errorCount}`);
            }
            if (this.errorCount >= this.repeatErrorThreshold) {
                this.repeatErrorCount++;
                if (this.repeatErrorCount === 1) {
                    console.log(`Repeat error threshold reached: ${this.repeatErrorCount}`);
                }
            }
        }

        // Update window and counts
        this.window.push(data);
        if (this.window.length > this.scanCounts) {
            const removedData = this.window.shift();
            if (!identifikasi_pattern.test(removedData) && !otentifikasi_pattern1.test(removedData) && !otentifikasi_pattern2.test(removedData)) {
                this.errorCount--;
            }
        }
    }

    receiveData(data) {
        this.checkFormat(data);
    }
}

// Example usage
// const serializer = new Serialization(100, 0.5, 5);
// serializer.receiveData("(90)ABC(91)123456");
// serializer.receiveData("(90)DEF(10)GHI(17)789(21)123456");
// serializer.receiveData("(01)JKLMNOPQRST(10)UVWXYZ12345(17)6789(21)987654");
// serializer.receiveData("(02)XXXXX(11)YYYYYY");
