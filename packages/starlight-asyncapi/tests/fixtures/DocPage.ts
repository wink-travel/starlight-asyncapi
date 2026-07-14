import { expect, type Locator, type Page } from '@playwright/test'

export class DocPage {
  public readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  goto(url: string) {
    return this.page.goto(url)
  }

  getByText(...args: Parameters<Page['getByText']>) {
    return this.page.getByText(...args)
  }

  getByRole(...args: Parameters<Page['getByRole']>) {
    return this.page.getByRole(...args)
  }

  getContent() {
    return this.page.locator('.sl-markdown-content')
  }

  async expectToHaveTitle(title: string) {
    await expect(this.page).toHaveTitle(`${title} | Starlight AsyncAPI`)
    await expect(this.getSectionHeading(title, 1)).toBeVisible()
  }

  getSectionHeading(name: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2) {
    return this.page.getByRole('heading', { exact: true, level, name })
  }

  getTocItems() {
    return this.#getTocChildrenItems(this.page.getByRole('complementary').locator('starlight-toc > nav > ul'))
  }

  async #getTocChildrenItems(list: Locator): Promise<TocItem[]> {
    const items: TocItem[] = []

    for (const item of await list.locator('> li').all()) {
      const link = await item.locator('> a').textContent()
      const name = link?.trim() ?? null

      if ((await item.locator('> ul').count()) > 0) {
        items.push({
          label: name,
          items: await this.#getTocChildrenItems(item.locator('> ul')),
        })
      } else {
        items.push({ name })
      }
    }

    return items
  }
}

type TocItem = TocItemGroup | TocItemLink

interface TocItemLink {
  name: string | null
}

interface TocItemGroup {
  items: (TocItemGroup | TocItemLink)[]
  label: string | null
}
