import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-tab-item',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf],
  templateUrl: './tab-item.html',
  styleUrl: './tab-item.scss',
})
export class TabItemComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) to!: string;
  @Input() icon?: string;
}
