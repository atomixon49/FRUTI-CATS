export class Timer {
    private timeLeft: number;
    private timerInterval: number | null = null;
    private timerElement: HTMLElement | null = null;
    private onTimeUp: () => void;

    constructor(duration: number, onTimeUp: () => void) {
        this.timeLeft = duration;
        this.onTimeUp = onTimeUp;
        this.setupTimerUI();
    }

    private setupTimerUI() {
        const timerContainer = document.createElement('div');
        timerContainer.id = 'timer-container';

        const clockIcon = document.createElement('span');
        clockIcon.id = 'clock-icon';
        clockIcon.textContent = '⏰';
        timerContainer.appendChild(clockIcon);

        this.timerElement = document.createElement('div');
        this.timerElement.id = 'timer';
        timerContainer.appendChild(this.timerElement);

        document.body.appendChild(timerContainer);
        this.updateDisplay();
    }

    private formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    private updateDisplay() {
        if (this.timerElement) {
            this.timerElement.textContent = this.formatTime(this.timeLeft);

            if (this.timeLeft <= 30) {
                this.timerElement.style.color = '#ff4444';
                const container = document.getElementById('timer-container');
                if (container) {
                    container.classList.add('shake');
                }
            }
        }
    }

    start() {
        if (!this.timerInterval) {
            this.timerInterval = window.setInterval(() => {
                this.timeLeft--;
                this.updateDisplay();

                if (this.timeLeft <= 0) {
                    this.stop();
                    this.onTimeUp();
                }
            }, 1000);
        }
    }

    stop() {
        if (this.timerInterval) {
            window.clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    reset(newDuration?: number) {
        this.stop();
        this.timeLeft = newDuration ?? this.timeLeft;
        this.updateDisplay();
    }

    getTimeLeft(): number {
        return this.timeLeft;
    }
}