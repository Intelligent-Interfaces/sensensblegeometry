export type TourStep = {
  title: string;
  text: string;
  actionRequired?: string; // UI element ID or action name that needs to be clicked/done
  highlightElement?: string; // CSS ID of element to pulse
  autoAction?: () => void; // Action to run automatically when entering step
};

export const tourState = $state({
  isActive: false,
  currentStepIndex: 0,
  steps: [] as TourStep[],
  
  startTour(steps: TourStep[]) {
    this.steps = steps;
    this.currentStepIndex = 0;
    this.isActive = true;
    this.executeCurrentStepAutoAction();
  },
  
  stopTour() {
    this.isActive = false;
    this.steps = [];
  },
  
  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.executeCurrentStepAutoAction();
    } else {
      this.stopTour();
    }
  },

  executeCurrentStepAutoAction() {
    const step = this.steps[this.currentStepIndex];
    if (step && step.autoAction) {
      step.autoAction();
    }
  },

  reportAction(action: string) {
    if (!this.isActive) return;
    const step = this.steps[this.currentStepIndex];
    if (step && step.actionRequired === action) {
      this.nextStep();
    }
  },

  get currentStep(): TourStep | null {
    if (!this.isActive || this.steps.length === 0) return null;
    return this.steps[this.currentStepIndex];
  }
});
