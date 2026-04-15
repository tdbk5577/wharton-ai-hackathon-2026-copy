const state = {
  propertyId: 'db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723',
  currentQuestion: null,
  currentQuestionTargetTopic: null,
  currentAnswerSource: 'text',
  gapAnalysisAgent: null
};

let mediaRecorder;
let audioChunks = [];
let activeStream;

window.generateQuestion = generateQuestion;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.saveAnswer = saveAnswer;

initialize();

async function initialize() {
  await Promise.all([loadBackendStatus(), loadSavedAnswers()]);
}

async function loadBackendStatus() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const demoProperty = data.demoProperty || {
      propertyName: 'Selected demo property',
      city: null,
      province: null,
      country: null,
      starRating: null,
      amenities: [],
      propertyDescription: 'Property context is unavailable, but the demo can still run.'
    };
    document.getElementById('apiStatus').textContent = data.status === 'ok' ? 'Backend connected' : 'Backend unavailable';
    document.getElementById('modeStatus').textContent = data.openAiConfigured ? 'OpenAI live' : 'Fallback question mode';
    document.getElementById('demoPropertyStatus').textContent = [demoProperty.city, demoProperty.province].filter(Boolean).join(', ') || 'Demo property ready';
    renderPropertyContext(demoProperty);
  } catch {
    document.getElementById('apiStatus').textContent = 'Backend unavailable';
    document.getElementById('modeStatus').textContent = 'Unavailable';
    document.getElementById('demoPropertyStatus').textContent = 'Unavailable';
  }
}

async function loadSavedAnswers() {
  try {
    const res = await fetch(`/api/answers?propertyId=${encodeURIComponent(state.propertyId)}`);
    const data = await res.json();
    renderSavedAnswers(data.answers || []);
  } catch {
    renderSavedAnswers([]);
  }
}

async function generateQuestion() {
  const review = document.getElementById('review').value.trim();
  if (!review) {
    showError('Please enter a review.');
    return;
  }

  const btn = document.getElementById('askBtn');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  clearError();
  clearSavedNotice();
  resetIntegrationUI();
  updateStatus('Generating a follow-up question...');

  try {
    const res = await fetch('/api/generate-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: state.propertyId,
        reviewText: review
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const gapAnalysisAgent = data.gapAnalysisAgent || {};
    const questionText = data.questionAgent?.questionText || data.question;
    if (!questionText) {
      throw new Error('Question generation returned no question text.');
    }

    state.currentQuestion = questionText;
    state.currentQuestionTargetTopic = gapAnalysisAgent.targetTopic || data.questionTargetTopic || null;
    state.currentAnswerSource = 'text';
    state.gapAnalysisAgent = gapAnalysisAgent;

    document.getElementById('questionText').textContent = questionText;
    document.getElementById('recommendedGap').textContent = formatTopic(gapAnalysisAgent.targetTopic || data.recommendedGap);
    document.getElementById('questionTargetTopic').textContent = formatTopic(gapAnalysisAgent.targetTopic || data.questionTargetTopic);
    document.getElementById('sentimentSummary').textContent = gapAnalysisAgent.sentimentSummary || data.sentimentSummary || 'No sentiment summary available.';
    document.getElementById('gapAgentReason').textContent = gapAnalysisAgent.reason || 'No gap-analysis reason returned.';
    document.getElementById('questionAgentMode').textContent = data.usedFallback
      ? 'Using local fallback question generation.'
      : 'Using OpenAI for question generation and text-to-speech.';
    renderPropertyContext(gapAnalysisAgent.propertyContext || null);
    renderChips('missingTopics', gapAnalysisAgent.missingTopics || data.missingTopics || []);
    renderLines('gapAgentSignals', gapAnalysisAgent.supportingSignals || []);

    document.getElementById('answer').value = '';
    document.getElementById('transcript').classList.remove('show');

    const audio = document.getElementById('audio');
    if (data.audio) {
      audio.src = data.audio;
      audio.style.display = 'block';
      setTimeout(() => audio.play().catch(() => {}), 100);
    } else {
      audio.removeAttribute('src');
      audio.style.display = 'none';
    }

    updateStatus(data.usedFallback ? 'Question generated in fallback mode.' : 'Question generated.');
  } catch (error) {
    showError(error.message);
    updateStatus('');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Follow-Up';
  }
}

async function startRecording() {
  clearError();

  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(activeStream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    mediaRecorder.onstop = handleRecordingStop;
    mediaRecorder.start();

    document.getElementById('recordBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';
    updateStatus('Recording answer...');
  } catch {
    showError('Microphone access was denied.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }

  document.getElementById('recordBtn').style.display = 'inline-block';
  document.getElementById('stopBtn').style.display = 'none';
}

async function handleRecordingStop() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  updateStatus('Transcribing answer...');

  const reader = new FileReader();
  reader.onloadend = async () => {
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: reader.result })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transcription failed.');
      }

      state.currentAnswerSource = 'voice';
      document.getElementById('answer').value = data.transcript;
      document.getElementById('transcript').textContent = `Voice transcript: "${data.transcript}"`;
      document.getElementById('transcript').classList.add('show');
      updateStatus('Transcription complete.');
    } catch (error) {
      showError(error.message);
      updateStatus('');
    }
  };

  reader.readAsDataURL(audioBlob);
}

async function saveAnswer() {
  const reviewText = document.getElementById('review').value.trim();
  const answer = document.getElementById('answer').value.trim();

  if (!state.currentQuestion) {
    showError('Generate a follow-up question first.');
    return;
  }

  if (!answer) {
    showError('Please provide an answer.');
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  clearError();
  updateStatus('Saving answer...');

  try {
    const res = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: state.propertyId,
        reviewText,
        question: state.currentQuestion,
        answer,
        answerSource: state.currentAnswerSource,
        questionTargetTopic: state.currentQuestionTargetTopic
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Save failed.');
    }

    document.getElementById('saved').textContent = 'Answer saved.';
    document.getElementById('integrationAgentStatus').textContent = data.integrationAgent.whatWeLearned;
    renderIntegrationSummary(data.integrationAgent);
    updateStatus('');
    await loadSavedAnswers();
  } catch (error) {
    showError(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Answer';
  }
}

function renderPropertyContext(property) {
  const resolvedProperty = property || {
    propertyName: 'Selected demo property',
    city: null,
    province: null,
    country: null,
    starRating: null,
    amenities: [],
    propertyDescription: 'Property context is unavailable, but the demo can still run.'
  };

  document.getElementById('propertyName').textContent = resolvedProperty.propertyName || 'Selected demo property';
  document.getElementById('propertyMeta').textContent = [
    [resolvedProperty.city, resolvedProperty.province, resolvedProperty.country].filter(Boolean).join(', '),
    resolvedProperty.starRating ? `${resolvedProperty.starRating}-star property` : null,
    resolvedProperty.propertyDescription
  ].filter(Boolean).join(' • ');
  renderChips('propertyAmenities', resolvedProperty.amenities || []);
}

function renderSavedAnswers(answers) {
  const container = document.getElementById('savedAnswers');
  if (!answers.length) {
    container.innerHTML = '<div class="empty">No saved answers yet.</div>';
    return;
  }

  container.innerHTML = answers.slice(0, 6).map((entry) => `
    <article class="saved-item">
      <strong>${escapeHtml(entry.question)}</strong>
      <div>${escapeHtml(entry.answer)}</div>
      <div class="microcopy">${escapeHtml(entry.whatWeLearned || '')}</div>
      <div class="saved-meta">${formatTopic(entry.questionTargetTopic || 'unknown')} • ${entry.answerSource} • ${new Date(entry.createdAt).toLocaleString()}</div>
    </article>
  `).join('');
}

function renderChips(elementId, items) {
  const container = document.getElementById(elementId);
  if (!items || !items.length) {
    container.innerHTML = '<span class="empty">None</span>';
    return;
  }

  container.innerHTML = items.map((item) => `<span class="chip">${escapeHtml(formatTopic(item))}</span>`).join('');
}

function renderLines(elementId, lines) {
  const container = document.getElementById(elementId);
  if (!lines || !lines.length) {
    container.innerHTML = '<span class="empty">No signals yet.</span>';
    return;
  }

  container.innerHTML = lines.map((line) => `<span>${escapeHtml(line)}</span>`).join('');
}

function renderIntegrationSummary(integrationAgent) {
  const summary = document.getElementById('integrationSummary');
  summary.innerHTML = `
    <strong>Integration Agent Output</strong><br>
    ${escapeHtml(integrationAgent.whatWeLearned)}<br><br>
    ${escapeHtml(integrationAgent.enrichedReviewSnippet)}
  `;
  summary.classList.add('show');
}

function resetIntegrationUI() {
  document.getElementById('integrationAgentStatus').textContent = 'Answer integration has not run yet.';
  document.getElementById('integrationSummary').classList.remove('show');
  document.getElementById('integrationSummary').textContent = '';
}

function formatTopic(topic) {
  return String(topic || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || 'Unknown';
}

function updateStatus(message) {
  document.getElementById('status').textContent = message;
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
}

function clearError() {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = '';
  errorDiv.classList.remove('show');
}

function clearSavedNotice() {
  document.getElementById('saved').textContent = '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
