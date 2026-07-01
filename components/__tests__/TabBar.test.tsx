import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TabBar from '../TabBar';
import type { ActiveTab } from '@/types';

expect.extend(toHaveNoViolations);

describe('TabBar', () => {
  const noop = jest.fn();

  describe('renders tab buttons with correct labels', () => {
    it('renders three tab buttons', () => {
      render(<TabBar activeTab="text" onTabChange={noop} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('renders "Text" label', () => {
      render(<TabBar activeTab="text" onTabChange={noop} />);
      expect(screen.getByRole('tab', { name: 'Text' })).toBeInTheDocument();
    });

    it('renders "Image Prompt" label', () => {
      render(<TabBar activeTab="text" onTabChange={noop} />);
      expect(screen.getByRole('tab', { name: 'Image Prompt' })).toBeInTheDocument();
    });

    it('renders "Email" label', () => {
      render(<TabBar activeTab="text" onTabChange={noop} />);
      expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    });

    it('renders a tablist container', () => {
      render(<TabBar activeTab="text" onTabChange={noop} />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('aria-selected reflects activeTab', () => {
    it('sets aria-selected correctly when activeTab is "text"', () => {
      render(<TabBar activeTab="text" onTabChange={noop} />);
      expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Image Prompt' })).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tab', { name: 'Email' })).toHaveAttribute('aria-selected', 'false');
    });

    it('sets aria-selected correctly when activeTab is "image"', () => {
      render(<TabBar activeTab="image" onTabChange={noop} />);
      expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tab', { name: 'Image Prompt' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'Email' })).toHaveAttribute('aria-selected', 'false');
    });

    it('sets aria-selected correctly when activeTab is "email"', () => {
      render(<TabBar activeTab="email" onTabChange={noop} />);
      expect(screen.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tab', { name: 'Image Prompt' })).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tab', { name: 'Email' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('calls onTabChange with correct value on click', () => {
    it('calls onTabChange with "text" when Text tab is clicked', async () => {
      const onTabChange = jest.fn();
      render(<TabBar activeTab="image" onTabChange={onTabChange} />);
      await userEvent.click(screen.getByRole('tab', { name: 'Text' }));
      expect(onTabChange).toHaveBeenCalledTimes(1);
      expect(onTabChange).toHaveBeenCalledWith('text');
    });

    it('calls onTabChange with "image" when Image Prompt tab is clicked', async () => {
      const onTabChange = jest.fn();
      render(<TabBar activeTab="text" onTabChange={onTabChange} />);
      await userEvent.click(screen.getByRole('tab', { name: 'Image Prompt' }));
      expect(onTabChange).toHaveBeenCalledTimes(1);
      expect(onTabChange).toHaveBeenCalledWith('image');
    });

    it('calls onTabChange with "email" when Email tab is clicked', async () => {
      const onTabChange = jest.fn();
      render(<TabBar activeTab="text" onTabChange={onTabChange} />);
      await userEvent.click(screen.getByRole('tab', { name: 'Email' }));
      expect(onTabChange).toHaveBeenCalledTimes(1);
      expect(onTabChange).toHaveBeenCalledWith('email');
    });
  });

  /**
   * Validates: Requirements 8.3, 8.4
   */
  describe('accessibility (WCAG 2.1 AA)', () => {
    it('has no WCAG 2.1 AA violations when rendering the default tab', async () => {
      const { container } = render(<TabBar activeTab="text" onTabChange={noop} />);
      const results = await axe(container, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('has no WCAG 2.1 AA violations when a non-default tab is active', async () => {
      const { container } = render(<TabBar activeTab="email" onTabChange={noop} />);
      const results = await axe(container, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      });
      expect(results).toHaveNoViolations();
    });
  });
});
