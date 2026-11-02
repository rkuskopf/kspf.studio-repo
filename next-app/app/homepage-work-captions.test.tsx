// @vitest-environment happy-dom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { HomepageWork } from './homepage-blocks';
import type { HomepageProject } from '../lib/storyblok/types';

const project: HomepageProject = {
  storyId: 1, storyUuid: 'one', slug: 'one', title: 'Title', displayName: 'Title',
  category: 'Category', sideCaption: 'Line one\nLine two', alt: '', order: 1,
  sideCaptionParts: [{ text: 'Line one\nLine two', href: 'https://example.com', target: '_blank' }],
  slides: [{url: '/image.jpg', type: 'image'}],
};
const render = (props: any) => {
  const element = document.createElement('div');
  element.innerHTML = renderToStaticMarkup(createElement(HomepageWork, {projects: [project], ...props}));
  return element;
};
it.each(['left', 'right', 'bottom-left', 'bottom-right'])('applies shared %s positions to every project and stacks fields in number/title/category/caption order', position => {
  const root = render({projects: [project, {...project, storyId: 2, slug: 'two'}], positions: {
    number: position, title: position, category: position, caption: position,
  }});
  const slots = root.querySelectorAll(`[data-caption-slot="${position}"]`);
  expect(slots).toHaveLength(2);
  for (const slot of slots) {
    expect([...slot.children].map(child => child.getAttribute('data-caption-field'))).toEqual(['number', 'title', 'category', 'caption']);
    expect(slot.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(slot.querySelector('br')).not.toBeNull();
  }
  expect(root.querySelectorAll('[id]').length).toBe(new Set([...root.querySelectorAll('[id]')].map(node => node.id)).size);
});
it('places defaults beside/below media and removes hidden/empty fields from slot spacing', () => {
  const positions = {number: 'left', title: 'bottom-left', category: 'right', caption: 'bottom-right'};
  const root = render({positions});
  expect(root.querySelector('[data-caption-slot="left"]')?.textContent).toBe('001');
  expect(root.querySelector('[data-caption-slot="bottom-left"]')?.textContent).toBe('Title');
  expect(root.querySelector('[data-caption-slot="right"]')?.textContent).toBe('Category');
  const empty = render({positions, projects: [{...project, category: '', sideCaption: '', sideCaptionParts: undefined}], captions: {showNumber: false, showTitle: true, showCategory: true, showCaption: true}});
  expect(empty.querySelectorAll('[data-caption-slot] [data-caption-field]')).toHaveLength(1);
  expect(empty.querySelector('[data-caption-slot="right"]')).toBeNull();
  expect(empty.querySelector('[data-caption-slot="left"]')).toBeNull();
});
it('merges side and bottom fields into independently ordered mobile columns', () => {
  const root=render({positions:{number:'left',title:'bottom-left',category:'right',caption:'bottom-right'}});
  const left=root.querySelector('[data-mobile-caption-slot="bottom-left"]');
  const right=root.querySelector('[data-mobile-caption-slot="bottom-right"]');
  expect([...left!.children].map(child=>child.getAttribute('data-caption-field'))).toEqual(['number','title']);
  expect([...right!.children].map(child=>child.getAttribute('data-caption-field'))).toEqual(['category','caption']);
});
it('renders the counter in the caption slot and keeps the legacy renderer for unmigrated Home', () => {
  const root = render({projects: [{...project, showSlideshowCounter: true}], positions: {number: 'left', title: 'left', category: 'right', caption: 'left'}});
  expect(root.querySelector('[data-caption-slot="left"] .homepage-project__slide-counter')?.textContent).toBe('001001');
  expect(root.querySelector('a')).toBeNull();
  expect(render({}).querySelector('[data-caption-slot]')).toBeNull();
});

it.each(['number', 'title', 'category', 'caption'])('hides the %s field on desktop and mobile without empty slots', field => {
  const root = render({projects: [project, {...project, storyId: 2, slug: 'two', showSlideshowCounter: true}], positions: {number: 'left', title: 'bottom-left', category: 'right', caption: 'bottom-right', [field]: 'hidden'}});
  expect(root.querySelector(`[data-caption-field="${field}"]`)).toBeNull();
  expect(root.querySelectorAll('[data-caption-slot], [data-mobile-caption-slot]').length).toBeGreaterThan(0);
  if (field === 'title') {
    for (const section of root.querySelectorAll('section')) {
      expect(section.hasAttribute('aria-labelledby')).toBe(false);
      expect(section.getAttribute('aria-label')).toBe('Title');
    }
  }
});
it('removes all caption slots when all four controls are Hidden', () => {
  const root = render({positions: {number: 'hidden', title: 'hidden', category: 'hidden', caption: 'hidden'}});
  expect(root.querySelector('[data-caption-slot], [data-mobile-caption-slot], [data-caption-field]')).toBeNull();
});
