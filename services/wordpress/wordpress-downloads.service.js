import Joi from 'joi'
import { renderDownloadsBadge } from '../downloads.js'
import { pathParams } from '../index.js'
import { description, BaseWordpress } from './wordpress-base.js'

const dateSchema = Joi.object()
  .pattern(Joi.date().iso(), Joi.number().integer())
  .required()

const extensionData = {
  plugin: {
    capt: 'Plugin',
    exampleSlug: 'bbpress',
  },
  theme: {
    capt: 'Theme',
    exampleSlug: 'twentyseventeen',
  },
}

const intervalMap = {
  dd: {
    limit: 1,
    interval: 'day',
  },
  dw: {
    limit: 7,
    interval: 'week',
  },
  dm: {
    limit: 30,
    interval: 'month',
  },
  dy: {
    limit: 365,
    interval: 'year',
  },
  dt: {
    limit: null,
  },
}

function DownloadsForExtensionType(extensionType) {
  const { capt, exampleSlug } = extensionData[extensionType]

  return class WordpressDownloads extends BaseWordpress {
    static name = `Wordpress${capt}Downloads`

    static category = 'downloads'

    static route = {
      base: `wordpress/${extensionType}`,
      pattern: ':interval(dd|dw|dm|dy|dt)/:slug',
    }

    static get openApi() {
      const key = `/wordpress/${extensionType}/{interval}/{slug}`
      const route = {}
      route[key] = {
        get: {
          summary: `WordPress ${capt} Downloads`,
          description,
          parameters: pathParams(
            {
              name: 'interval',
              example: 'dm',
              schema: { type: 'string', enum: this.getEnum('interval') },
            },
            {
              name: 'slug',
              example: exampleSlug,
            },
          ),
        },
      }
      return route
    }

    static defaultBadgeData = { label: 'downloads' }

    static render({ interval, downloads }) {
      return renderDownloadsBadge({
        downloads,
        interval: intervalMap[interval].interval,
      })
    }

    async handle({ interval, slug }) {
      const { limit } = intervalMap[interval]
      let downloads
      if (limit === null) {
        const { downloaded: _downloads } = await this.fetch({
          extensionType,
          slug,
        })
        downloads = _downloads
      } else {
        const extType = extensionType === 'plugin' ? 'plugin' : 'themes'
        const json = await this._requestJson({
          schema: dateSchema,
          url: `https://api.wordpress.org/stats/${extType}/1.0/downloads.php`,
          options: {
            searchParams: {
              slug,
              limit,
            },
          },
        })
        downloads = Object.values(json).reduce(
          (a, b) => parseInt(a) + parseInt(b),
        )
      }

      return this.constructor.render({ interval, downloads })
    }
  }
}

function InstallsForExtensionType(extensionType) {
  const { capt, exampleSlug } = extensionData[extensionType]

  return class WordpressInstalls extends BaseWordpress {
    static name = `Wordpress${capt}Installs`

    static category = 'downloads'

    static route = {
      base: `wordpress/${extensionType}/installs`,
      pattern: ':slug',
    }

    static get openApi() {
      const key = `/wordpress/${extensionType}/installs/{slug}`
      const route = {}
      route[key] = {
        get: {
          summary: `WordPress ${capt} Active Installs`,
          description,
          parameters: pathParams({
            name: 'slug',
            example: exampleSlug,
          }),
        },
      }
      return route
    }

    static defaultBadgeData = { label: 'active installs' }

    async handle({ slug }) {
      const { active_installs: installCount } = await this.fetch({
        extensionType,
        slug,
      })
      return renderDownloadsBadge({ downloads: installCount })
    }
  }
}

const downloadServices = ['plugin', 'theme'].map(DownloadsForExtensionType)
const installServices = ['plugin', 'theme'].map(InstallsForExtensionType)
const modules = [...downloadServices, ...installServices]
export default modules
