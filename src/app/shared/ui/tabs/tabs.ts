import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';
import { TabItemComponent } from '../tab-item/tab-item';

export type TabDef = { label: string; to: string; icon?: string };

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [TabItemComponent, NgFor],
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class TabsComponent {
  @Input({ required: true }) tabs!: TabDef[];
}
