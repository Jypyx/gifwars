import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GameModal from '@/components/ui/GameModal.vue'

const mountModal = (props: Record<string, unknown> = {}) =>
  mount(GameModal, {
    props: { open: true, title: 'Titre', ...props },
    slots: { default: '<p>Contenu</p>' },
    attachTo: document.body,
  })

describe('GameModal', () => {
  it('closes with the cross, the backdrop and Escape', async () => {
    const wrapper = mountModal()
    await wrapper.find('button[aria-label="Fermer"]').trigger('click')
    await wrapper.find('[data-testid="backdrop"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(3)
    wrapper.unmount()
  })

  it('cannot be dismissed when not closable', async () => {
    const wrapper = mountModal({ closable: false })
    expect(wrapper.find('button[aria-label="Fermer"]').exists()).toBe(false)
    await wrapper.find('[data-testid="backdrop"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
  })

  it('can ignore backdrop clicks and hide the cross', async () => {
    const wrapper = mountModal({ closeOnBackdrop: false, showCross: false })
    expect(wrapper.find('button[aria-label="Fermer"]').exists()).toBe(false)
    await wrapper.find('[data-testid="backdrop"]').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
  })

  it('renders nothing when closed', () => {
    const wrapper = mountModal({ open: false })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})
