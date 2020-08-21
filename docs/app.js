// Google Pay API のバージョンを定義する
const baseRequest = {
  apiVersion: 2,
  apiVersionMinor: 0,
}

// サポートされている支払いカードとネットワークを定義する
const allowedCardNetworks = [
  'AMEX',
  'DISCOVER',
  'INTERAC',
  'JCB',
  'MASTERCARD',
  'VISA',
]
const allowedCardAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS']

// 決済機関にお支払いトークンをリクエストする
const tokenizationSpecification = {
  type: 'PAYMENT_GATEWAY',
  parameters: {
    gateway: 'example',
    gatewayMerchantId: 'exampleGatewayMerchantId',
  },
}

// 許可されたお支払い方法を記述する
const baseCardPaymentMethod = {
  type: 'CARD', // ''CARD', 'PAYPAL'
  parameters: {
    allowedAuthMethods: allowedCardAuthMethods,
    allowedCardNetworks: allowedCardNetworks,
  },
}

// オプションを含むCARD支払い方法に対するサイトのサポートについて説明してください
const cardPaymentMethod = Object.assign({}, baseCardPaymentMethod, {
  tokenizationSpecification: tokenizationSpecification,
})

// 初期化された google.payments.api.PaymentsClient オブジェクト
let paymentsClient = null

// Google Pay APIでサポートされている支払い方法に対するサイトのサポートを設定します
function getGoogleIsReadyToPayRequest() {
  return Object.assign({}, baseRequest, {
    allowedPaymentMethods: [baseCardPaymentMethod],
  })
}

// Google Pay APIのサポートを構成する
function getGooglePaymentDataRequest() {
  const paymentDataRequest = Object.assign({}, baseRequest)
  paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod]
  paymentDataRequest.transactionInfo = getGoogleTransactionInfo()
  paymentDataRequest.merchantInfo = {
    // NOTE: 販売者IDは、Googleの承認後、本番環境で利用できます
    // https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist
    merchantId: '12345678901234567890',
    merchantName: 'サンプルショップ',
  }
  paymentDataRequest.callbackIntents = ['PAYMENT_AUTHORIZATION']
  return paymentDataRequest
}

// Google Pay API での支払いが可能かどうかを確認する
const isReadyToPayRequest = Object.assign({}, baseRequest)
isReadyToPayRequest.allowedPaymentMethods = [baseCardPaymentMethod]

// アクティブなPaymentsClientを返すか、初期化します
function getGooglePaymentsClient() {
  if (paymentsClient === null) {
    paymentsClient = new google.payments.api.PaymentsClient({
      environment: 'TEST',
      paymentDataCallbacks: {
        onPaymentAuthorized: onPaymentAuthorized,
      },
    })
  }
  return paymentsClient
}

// 支払い承認のコールバックインテントを処理します
function onPaymentAuthorized(paymentData) {
  return new Promise(function (resolve, reject) {
    // 応答を処理する
    processPayment(paymentData)
      .then(function () {
        console.log('SUCCESS');
        resolve({ transactionState: 'SUCCESS' })
        alert('お支払いが完了しました')
      })
      .catch(function () {
        console.log('ERROR');
        resolve({
          transactionState: 'ERROR',
          error: {
            intent: 'PAYMENT_AUTHORIZATION',
            message: 'Insufficient funds',
            reason: 'PAYMENT_DATA_INVALID',
          },
        })
      })
  })
}

// Google がホストする JavaScript が読み込まれた後に Google PaymentsClient を初期化する
function onGooglePayLoaded() {
  const paymentsClient = getGooglePaymentsClient()
  paymentsClient
    .isReadyToPay(getGoogleIsReadyToPayRequest())
    .then(function (response) {
      if (response.result) {
        addGooglePayButton()
        // NOTE: サイトの機能を確認した後、パフォーマンスを改善するために支払いデータをプリフェッチします
        prefetchGooglePaymentData();
      }
    })
    .catch(function (err) {
      // デバッグのための開発者コンソールのエラー
      console.error(err)
    })
}

// 既存のチェックアウトボタンの横に Google Pay 購入ボタンを追加する
function addGooglePayButton() {
  const paymentsClient = getGooglePaymentsClient()
  const button = paymentsClient.createButton({
    onClick: onGooglePaymentButtonClicked,
  })
  document.getElementById('container').appendChild(button)
}

// Google Pay API に支払い金額、通貨、金額ステータスを提供する
function getGoogleTransactionInfo() {
  return {
    displayItems: [
      {
        label: '小計',
        type: 'SUBTOTAL',
        price: '1000',
      },
      {
        label: '消費税',
        type: 'TAX',
        price: '100',
      },
    ],
    countryCode: 'JP',
    currencyCode: 'JPY',
    totalPriceStatus: 'FINAL',
    totalPrice: '1100',
    totalPriceLabel: '合計',
  }
}

// パフォーマンスを改善するための支払いデータのプリフェッチ
function prefetchGooglePaymentData() {
  const paymentDataRequest = getGooglePaymentDataRequest()
  // transactionInfoを設定する必要がありますが、キャッシュには影響しません
  paymentDataRequest.transactionInfo = {
    totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
    currencyCode: 'JPY',
  }
  const paymentsClient = getGooglePaymentsClient()
  paymentsClient.prefetchPaymentData(paymentDataRequest)
}

// Google Pay 支払いボタンがクリックされたときに Google Pay 支払いシートを表示する
function onGooglePaymentButtonClicked() {
  const paymentDataRequest = getGooglePaymentDataRequest()
  paymentDataRequest.transactionInfo = getGoogleTransactionInfo()

  const paymentsClient = getGooglePaymentsClient()
  paymentsClient.loadPaymentData(paymentDataRequest)
}

// Google Pay API から返された支払いデータを処理する
function processPayment(paymentData) {
  return new Promise(function (resolve, reject) {
    // デバッグのために開発者コンソールに返されたデータを表示する
    console.log(paymentData)
    // TODO: 支払いトークンをゲートウェイに渡して支払いを処理する
    paymentToken = paymentData.paymentMethodData.tokenizationData.token
    resolve({})
  })
}
