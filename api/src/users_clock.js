const OSMesa = require('./services/osmesa')
const { compareDesc, parse } = require('date-fns')
const {
  merge, map, props, sum, head
} = require('ramda')
const conn = require('./db/connection')

/*
 * Given the edit times for a user get the last edit
 *
 * @param {Array[Date]} editTimes
 */
function getLastEdit(editTimes) {
  const days = editTimes.map((time) => parse(time.day))
  return head(days.sort(compareDesc))
}

const summable = [
  'buildings_add',
  'buildings_mod',
  'poi_add',
  'roads_add',
  'roads_mod',
  'waterways_add'
]

/*
 * Given a records object, sum all the summable edits
 * and return the number back as the sum of all edits
 *
 * @param {Object} records
 */
const sumEdits = (records) => {
  const summableProperties = map((x) => Number(x))(props(summable, records))
  return sum(summableProperties)
}

/*
 * Worker runs in a clock process and updates the cache
 * that holds users
 *
 * @returns {Promise} a response
 */
async function usersWorker() {
  try {
    const db = conn()
    const users = await db('users').select('id', 'osm_id') // Get all users

    // Map user info to knex objects
    const delay = (time) => new Promise((res) => setTimeout(() => res(), time))
    const promises = users.map(async (obj) => {
      // Get edit count from OSMesa
      await delay(50)
      try {
        const resp = await OSMesa.getUser(obj.osm_id)

        if (resp.length) {
          const data = JSON.parse(resp)
          obj.edit_count = sumEdits(data) || 0
          obj.last_edit = getLastEdit(data.edit_times)
        }
      }
      catch (e) {
        console.error(`${obj.osm_id} not retrieved from OSMesa`, e.message)
      }

      return db('users')
        .where('osm_id', obj.osm_id)
        .then(() => db('users').where('osm_id', obj.osm_id).update(
          merge(obj, {
            updated_at: db.fn.now()
          })
        ))
    })

    // Return a single promise wrapping all the
    // SQL statements
    return Promise.all(promises)
  }
  catch (e) {
    console.error(e)
    return Promise.resolve()
  }
}

// Run
if (require.main === module) {
  usersWorker()
    .then((resp) => {
      console.log(`Updated ${resp.length} records.`)
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

module.exports = usersWorker
