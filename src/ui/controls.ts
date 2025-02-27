import { Window } from "./wm.ts"

/**
 * A generic UI controls class for creating interactive elements
 * like buttons, toggles, and sliders.
 */
export class Controls {
    protected container: HTMLDivElement
    protected controlsMap: Map<string, HTMLElement> = new Map()
    // Map to track radio button groups
    protected radioGroups: Map<string, Set<string>> = new Map()

    constructor(public window: Window) {
        this.container = document.createElement("div")
        this.container.className = "controls"
        this.window.element.appendChild(this.container)
    }

    /**
     * Adds a simple button with a click handler
     */
    addButton(
        id: string,
        label: string,
        onClick: () => void,
    ): HTMLButtonElement {
        const button = document.createElement("button")
        button.textContent = label
        button.addEventListener("click", onClick)
        this.container.appendChild(button)
        this.controlsMap.set(id, button)
        return button
    }

    /**
     * Adds a toggle button that switches between two states
     */
    addToggleButton(
        id: string,
        labels: [string, string],
        isActive: () => boolean,
        onToggle: () => void,
    ): HTMLButtonElement {
        const button = document.createElement("button")
        button.textContent = isActive() ? labels[1] : labels[0]
        button.addEventListener("click", () => {
            onToggle()
            button.textContent = isActive() ? labels[1] : labels[0]
        })
        this.container.appendChild(button)
        this.controlsMap.set(id, button)
        return button
    }

    /**
     * Adds a radio button that is part of a group where only one can be selected
     */
    addRadioButton(
        id: string,
        groupName: string,
        label: string,
        value: any,
        isSelected: boolean,
        onSelect: (value: any) => void,
    ): HTMLButtonElement {
        // Create the button element
        const button = document.createElement("button")
        button.textContent = label
        button.dataset.value = String(value)

        // Set initial selected state
        if (isSelected) {
            button.classList.add("selected")
        }

        // Add to controls map
        this.controlsMap.set(id, button)

        // Add to radio group tracking
        if (!this.radioGroups.has(groupName)) {
            this.radioGroups.set(groupName, new Set())
        }
        this.radioGroups.get(groupName)?.add(id)

        // Add click handler
        button.addEventListener("click", () => {
            // Deselect all other buttons in the group
            const groupButtons = this.radioGroups.get(groupName) || new Set()
            for (const btnId of groupButtons) {
                const btn = this.getControl<HTMLButtonElement>(btnId)
                if (btn) {
                    btn.classList.remove("selected")
                }
            }

            // Select this button
            button.classList.add("selected")

            // Call the handler with this button's value
            onSelect(value)
        })

        this.container.appendChild(button)
        return button
    }

    /**
     * Creates a radio button group with multiple options
     */
    addRadioGroup(
        groupName: string,
        options: Array<{ id: string; label: string; value: any }>,
        initialValue: any,
        onChange: (value: any) => void,
    ): HTMLButtonElement[] {
        return options.map((option) =>
            this.addRadioButton(
                option.id,
                groupName,
                option.label,
                option.value,
                option.value === initialValue,
                onChange,
            )
        )
    }

    /**
     * Adds a slider control with min, max and step values
     */
    addSlider(
        id: string,
        min: number,
        max: number,
        step: number,
        initialValue: number,
        onChange: (value: number) => void,
    ): HTMLInputElement {
        const slider = document.createElement("input")
        slider.type = "range"
        slider.min = min.toString()
        slider.max = max.toString()
        slider.step = step.toString()
        slider.value = initialValue.toString()
        slider.addEventListener("input", () => {
            onChange(parseFloat(slider.value))
        })
        this.container.appendChild(slider)
        this.controlsMap.set(id, slider)
        return slider
    }

    /**
     * Gets a control by ID with type casting
     */
    getControl<T extends HTMLElement>(id: string): T | undefined {
        return this.controlsMap.get(id) as T | undefined
    }

    /**
     * Updates a control's properties or state
     */
    updateControl(id: string, updater: (element: HTMLElement) => void): void {
        const control = this.controlsMap.get(id)
        if (control) {
            updater(control)
        }
    }

    /**
     * Updates the selected radio button in a group
     */
    setRadioSelection(groupName: string, value: any): void {
        const groupButtons = this.radioGroups.get(groupName) || new Set()

        for (const btnId of groupButtons) {
            const btn = this.getControl<HTMLButtonElement>(btnId)
            if (btn) {
                if (btn.dataset.value === String(value)) {
                    btn.classList.add("selected")
                } else {
                    btn.classList.remove("selected")
                }
            }
        }
    }
}
