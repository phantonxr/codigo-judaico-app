import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Download, ShoppingCart, Check, Gift } from 'lucide-react'
import { getMyBooks, createBookCheckoutSession, getBookDownloadUrl } from '../services/books.js'

function BookCard({ book, onBuy, buying, t }) {
  const isLockedAccessBonus = book.isAccessBonus && !book.isPurchased

  return (
    <div
      className="card"
      style={{
        borderColor: book.isPurchased || book.isAccessBonus ? 'rgba(215, 178, 74, 0.6)' : 'rgba(255,255,255,0.08)',
        opacity: isLockedAccessBonus || (!book.isPurchasable && !book.isPurchased) ? 0.72 : 1,
      }}
    >
      <div className="card-inner" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {book.coverImageUrl ? (
            <img
              src={book.coverImageUrl}
              alt={book.title}
              style={{
                width: 80,
                height: 110,
                objectFit: 'cover',
                borderRadius: 8,
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 110,
                borderRadius: 8,
                background: 'rgba(215, 178, 74, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {book.isAccessBonus ? (
                <Gift size={28} style={{ color: 'var(--gold-2)' }} />
              ) : (
                <BookOpen size={28} style={{ color: 'var(--gold-2)' }} />
              )}
            </div>
          )}

          <div style={{ flex: 1, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16, lineHeight: 1.3 }}>{book.title}</strong>
              {book.isPurchased && (
                <span className="badge" style={{ background: 'rgba(80, 200, 120, 0.15)', color: '#6ecc8a', border: '1px solid rgba(80,200,120,0.3)', fontSize: 11 }}>
                  {book.isAccessBonus ? t('books.bonus_badge') : t('books.acquired_badge')}
                </span>
              )}
              {isLockedAccessBonus && (
                <span className="badge" style={{ fontSize: 11 }}>{t('books.access_bonus_badge')}</span>
              )}
              {!book.isAccessBonus && !book.isPurchasable && !book.isPurchased && (
                <span className="badge" style={{ fontSize: 11 }}>{t('books.coming_soon')}</span>
              )}
            </div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{book.description}</div>
            <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 18 }}>{book.priceLabel}</div>
            {isLockedAccessBonus && (
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                {t('books.access_bonus_locked')}
              </div>
            )}
          </div>
        </div>

        {book.isPurchased ? (
          <a
            href={getBookDownloadUrl(book.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            <Download size={16} />
            {t('books.download_pdf')}
          </a>
        ) : book.isPurchasable ? (
          <button
            className="btn btn-primary"
            onClick={() => onBuy(book.id)}
            disabled={buying}
            style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            <ShoppingCart size={16} />
            {buying ? t('books.buying') : t('books.buy_btn', { price: book.priceLabel })}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function Livros() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buyingBookId, setBuyingBookId] = useState(null)
  const [buyError, setBuyError] = useState('')

  const justPurchased = searchParams.get('type') === 'books' && searchParams.get('session_id')

  useEffect(function () {
    getMyBooks()
      .then(function (data) {
        setBooks(data)
        setLoading(false)
      })
      .catch(function (err) {
        setError(err?.message || t('books.error_load'))
        setLoading(false)
      })
  }, [t])

  async function handleBuy(bookId) {
    setBuyError('')
    setBuyingBookId(bookId)

    try {
      const response = await createBookCheckoutSession([bookId])

      if (!response?.url) {
        throw new Error(t('checkout.errors.no_url'))
      }

      window.location.href = response.url
    } catch (caught) {
      const msg =
        caught?.data?.detail ||
        caught?.data?.message ||
        caught?.message ||
        t('books.error_checkout')
      setBuyError(String(msg).replace(/^API \d+:\s*/u, ''))
      setBuyingBookId(null)
    }
  }

  const purchasedBooks = books.filter(function (b) { return b.isPurchased })
  const lockedBonusBooks = books.filter(function (b) { return b.isAccessBonus && !b.isPurchased })
  const availableBooks = books.filter(function (b) { return !b.isPurchased && !b.isAccessBonus })

  return (
    <div className="container" style={{ padding: '28px 0 72px' }}>
      <div style={{ maxWidth: 780, marginInline: 'auto', display: 'grid', gap: 24 }}>

        <div className="card">
          <div className="card-inner" style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={20} style={{ color: 'var(--gold-2)' }} />
              <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>{t('books.title')}</h1>
            </div>
            <div className="muted" style={{ lineHeight: 1.6 }}>
              {t('books.description')}
            </div>
          </div>
        </div>

        {justPurchased && (
          <div
            className="card"
            style={{ borderColor: 'rgba(80, 200, 120, 0.4)', background: 'rgba(80,200,120,0.06)' }}
          >
            <div className="card-inner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Check size={20} style={{ color: '#6ecc8a', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 900, color: '#6ecc8a' }}>{t('books.purchased_success_title')}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {t('books.purchased_success_desc')}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="muted" style={{ textAlign: 'center', padding: 32 }}>{t('common.loading')}</div>
        )}

        {error && (
          <div className="muted" style={{ color: '#f3b0b0' }}>{error}</div>
        )}

        {buyError && (
          <div className="muted" style={{ color: '#f3b0b0' }}>{buyError}</div>
        )}

        {!loading && purchasedBooks.length > 0 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('books.my_library')}</div>
            {purchasedBooks.map(function (book) {
              return (
                <BookCard
                  key={book.id}
                  book={book}
                  onBuy={handleBuy}
                  buying={buyingBookId === book.id}
                  t={t}
                />
              )
            })}
          </div>
        )}

        {!loading && availableBooks.length > 0 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {purchasedBooks.length > 0 ? t('books.more_available') : t('books.available')}
            </div>
            {availableBooks.map(function (book) {
              return (
                <BookCard
                  key={book.id}
                  book={book}
                  onBuy={handleBuy}
                  buying={buyingBookId === book.id}
                  t={t}
                />
              )
            })}
          </div>
        )}

        {!loading && lockedBonusBooks.length > 0 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('books.access_bonus_section')}</div>
            {lockedBonusBooks.map(function (book) {
              return (
                <BookCard
                  key={book.id}
                  book={book}
                  onBuy={handleBuy}
                  buying={buyingBookId === book.id}
                  t={t}
                />
              )
            })}
          </div>
        )}

        {!loading && books.length === 0 && !error && (
          <div className="card">
            <div className="card-inner muted" style={{ textAlign: 'center', padding: 32 }}>
              {t('books.empty')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
