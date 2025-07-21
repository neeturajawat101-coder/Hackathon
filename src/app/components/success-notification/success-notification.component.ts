import { Component, Input, Output, EventEmitter, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-success-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './success-notification.component.html',
  styleUrls: ['./success-notification.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        transform: 'translateY(0)',
        opacity: 1
      })),
      transition('void => *', [
        style({
          transform: 'translateY(-100%)',
          opacity: 0
        }),
        animate('300ms ease-in')
      ]),
      transition('* => void', [
        animate('300ms ease-out', style({
          transform: 'translateY(-100%)',
          opacity: 0
        }))
      ])
    ]),
    trigger('fadeInOut', [
      state('in', style({opacity: 1})),
      transition('void => *', [
        style({opacity: 0}),
        animate('200ms ease-in')
      ]),
      transition('* => void', [
        animate('200ms ease-out', style({opacity: 0}))
      ])
    ])
  ]
})
export class SuccessNotificationComponent implements OnInit {
  @Input() show: boolean = false;
  @Input() title: string = 'Review Request Created!';
  @Input() message: string = 'Your merge request has been successfully saved and is ready for review. You can view it in the ALL Mr Page.';
  @Output() onGoToDashboard = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Auto-close after 5 seconds if not manually closed, only in browser
    if (this.show && this.isBrowser) {
      setTimeout(() => {
        this.closeNotification();
      }, 5000);
    }
  }

  goToDashboard() {
    this.onGoToDashboard.emit();
  }

  closeNotification() {
    this.onClose.emit();
  }
}
