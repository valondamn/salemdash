import { Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[countUp]',
  standalone: true,
})
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) countUp!: number;
  @Input() countUpDuration = 900;

  private rafId: number | null = null;
  private currentValue = 0;
  private readonly fmt = new Intl.NumberFormat('ru-RU');

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countUp']) {
      const target = Number(this.countUp) || 0;
      this.animateTo(target);
    }
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private animateTo(target: number): void {
    this.cancel();

    const start = this.currentValue;
    const diff = target - start;

    if (diff === 0) {
      this.el.nativeElement.textContent = this.fmt.format(target);
      return;
    }

    // If the value is small or it's a first-time 0→0, skip animation
    if (target === 0) {
      this.currentValue = 0;
      this.el.nativeElement.textContent = '0';
      return;
    }

    const startTime = performance.now();
    const duration = this.countUpDuration;

    const tick = (now: number): void => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      this.currentValue = Math.round(start + diff * eased);
      this.el.nativeElement.textContent = this.fmt.format(this.currentValue);

      if (t < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.currentValue = target;
        this.el.nativeElement.textContent = this.fmt.format(target);
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
