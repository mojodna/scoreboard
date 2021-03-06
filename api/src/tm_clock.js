const {
  pick, merge, omit
} = require('ramda')
const { TM, extractCampaignHashtag } = require('./services/tm')
const conn = require('./db/connection')

/**
 * Worker runs in a clock process and updates the cache
 * that holds Tasking Manager statistics
 *
 * @returns {Promise} a response
 */
async function tmWorker() {
  // Get projects from TM2
  try {
    const db = conn()
    const response = await TM.getProjects()
    const { features } = JSON.parse(response)
    if (features) {
      // Map the features to objects for sql insertion
      const sqlObjects = features.map((feature) => {
        const properties = pick([
          'done',
          'description',
          'author',
          'status',
          'changeset_comment',
          'priority',
          'name',
          'instructions',
          'validated'
        ], feature.properties)
        const noPropertiesFeature = merge(feature, { properties: {} })
        const mainHashtag = extractCampaignHashtag(properties.changeset_comment)
        const {
          created: created_at, last_update: updated_at // eslint-disable-line camelcase
        } = feature.properties
        return merge(properties, {
          campaign_hashtag: mainHashtag,
          created_at,
          updated_at,
          geometry: JSON.stringify(noPropertiesFeature),
          tm_id: feature.id
        })
      })

      // Add all features as single feature collection geometry
      const onlyGeometries = features.map(omit(['properties']))
      const fc = { type: 'FeatureCollection', features: onlyGeometries }

      // Map feature collection to prepared SQL statement
      const featureSQL = db('features')
        .where('name', 'tm_campaigns')
        .then((rows) => {
          if (rows.length === 0) {
            return db('features').insert({
              name: 'tm_campaigns',
              feature: fc,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            })
          }
          return db('features')
            .where('name', 'tm_campaigns')
            .update({
              updated_at: db.fn.now(),
              feature: JSON.stringify(fc)
            })
        })

      // Map campaign attributes to prepared SQL statements
      const promises = sqlObjects.map((obj) => db('campaigns')
        .where('tm_id', obj.tm_id)
        .then((rows) => {
          if (rows.length === 0) { // Not found
            return db('campaigns').insert(obj)
          }
          return db('campaigns').where('tm_id', obj.tm_id).update(obj)
        }))
      promises.push(featureSQL)

      // Return a single promise wrapping all the
      // SQL statements
      return Promise.all(promises)
    }
    throw new Error('Invalid response from Tasking Manager')
  }
  catch (e) {
    console.error(e)
    return Promise.resolve()
  }
}

// Run
if (require.main === module) {
  tmWorker()
    .then((resp) => {
      console.log(`Updated ${resp.length} records.`)
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

module.exports = tmWorker
