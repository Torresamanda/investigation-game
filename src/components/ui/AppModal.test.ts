import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppModal from './AppModal.vue'

it('fecha por clique iniciado no fundo, mas não por clique ou arrasto iniciado no conteúdo', async () => {
  const view = mount(AppModal, {
    props: { labelledBy: 'title' },
    slots: { default: '<section><h2 id="title">Detalhes</h2></section>' },
  })
  view
    .get('section')
    .element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: -1, clientY: -1 }),
    )
  await nextTick()
  await view.get('dialog').trigger('click', { clientX: -1, clientY: -1 })
  expect(view.emitted('close')).toBeUndefined()
  view
    .get('dialog')
    .element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: -1, clientY: -1 }),
    )
  await nextTick()
  await view.get('dialog').trigger('click', { clientX: -1, clientY: -1 })
  expect(view.emitted('close')).toHaveLength(1)
  view.unmount()
})
