#!/usr/bin/env python3
"""
Vereinfachter Buzzer Test - Testet nur die Host-Seite
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import json

def setup_driver():
    options = Options()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-cache')
    options.add_argument('--disk-cache-size=1')
    options.add_argument('--aggressive-cache-discard')
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    return webdriver.Chrome(options=options)

def test_host_only(base_url, test_name):
    """Teste nur Host-Seite - simuliere Spiel-Start manuell"""
    print(f"\n{'='*70}")
    print(f"🧪 TEST: {test_name}")
    print(f"🌐 URL: {base_url}")
    print(f"{'='*70}\n")

    driver = setup_driver()

    try:
        # Schritt 1: Quiz erstellen
        print("📝 Erstelle Buzzer-Quiz...")
        driver.get(base_url)
        time.sleep(2)

        quiz_js = """
        const testQuiz = {
            id: 'buzzer-test-' + Date.now(),
            title: 'Buzzer Debug Test',
            questions: [{
                type: 'buzzer',
                question: 'Was ist die Hauptstadt von Deutschland?',
                points: 100,
                timeLimit: 30
            }],
            createdAt: new Date().toISOString()
        };
        const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        quizzes.push(testQuiz);
        localStorage.setItem('quizzes', JSON.stringify(quizzes));
        return testQuiz.id;
        """
        quiz_id = driver.execute_script(quiz_js)
        print(f"✅ Quiz ID: {quiz_id}")

        # Schritt 2: Zur Host-Seite
        print("🎮 Öffne Host-Seite...")
        driver.get(f"{base_url}/host/{quiz_id}")
        time.sleep(3)

        # Schritt 3: Console Logs VOR Spiel-Start
        logs_before = driver.get_log('browser')
        errors_before = [l for l in logs_before if l['level'] == 'SEVERE']
        print(f"📊 Logs vor Start: {len(logs_before)} ({len(errors_before)} Errors)")

        # Schritt 4: Simuliere Spiel-Start durch Socket-Event
        print("🚀 Simuliere Spiel-Start...")

        # Methode 1: Klicke auf Start-Button (wenn Socket läuft)
        try:
            start_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Spiel starten')]")
            start_btn.click()
            print("✅ Start-Button geklickt")
            time.sleep(4)
        except:
            print("⚠️  Kein Start-Button - Socket-Server läuft nicht")
            print("⚙️  Simuliere game-state direkt...")

            # Methode 2: Setze game-state manuell auf 'question'
            simulate_js = """
            // Simuliere dass das Spiel gestartet wurde
            const event = new CustomEvent('game-started', {
                detail: {
                    question: {
                        type: 'buzzer',
                        question: 'Was ist die Hauptstadt von Deutschland?',
                        timeLimit: 30,
                        points: 100
                    },
                    questionIndex: 0,
                    totalQuestions: 1
                }
            });
            window.dispatchEvent(event);
            return 'Game-started Event dispatched';
            """
            result = driver.execute_script(simulate_js)
            print(f"⚙️  {result}")
            time.sleep(2)

        # Schritt 5: Screenshot NACH Start
        screenshot_path = f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/host-after-start-{test_name}.png'
        driver.save_screenshot(screenshot_path)
        print(f"📸 Screenshot: {screenshot_path}")

        # Schritt 6: Console Logs NACH Start
        logs_after = driver.get_log('browser')
        print(f"\n{'='*70}")
        print(f"📋 CONSOLE LOGS NACH SPIEL-START ({len(logs_after)} Einträge)")
        print(f"{'='*70}\n")

        errors = []
        warnings = []

        for log in logs_after:
            msg = log['message']
            level = log['level']

            if level == 'SEVERE' or 'error' in msg.lower():
                errors.append(log)
                print(f"❌ ERROR: {msg[:250]}")
            elif level == 'WARNING' and 'React Router' not in msg:
                warnings.append(log)
                if 'Cannot read' in msg or 'undefined' in msg or 'null' in msg:
                    print(f"⚠️  WARN: {msg[:250]}")

        # Schritt 7: Prüfe Seiten-Inhalt
        print(f"\n{'='*70}")
        print("🔍 SEITEN-ANALYSE")
        print(f"{'='*70}\n")

        body_text = driver.find_element(By.TAG_NAME, 'body').text

        if len(body_text.strip()) < 100:
            print("❌ SEITE IST FAST LEER!")
            print(f"   Body Text Length: {len(body_text)} Zeichen")
            print(f"   Body Text: '{body_text[:200]}'")
        else:
            print(f"✅ Seite hat Inhalt ({len(body_text)} Zeichen)")

        # Prüfe ob Buzzer-Frage angezeigt wird
        if "Was ist die Hauptstadt von Deutschland?" in body_text:
            print("✅ Buzzer-Frage wird angezeigt!")
        else:
            print("⚠️  Buzzer-Frage NICHT gefunden")

        if "Buzzer Debug Test" in body_text or "Python Buzzer Test" in body_text:
            print("✅ Quiz-Titel gefunden")

        # Prüfe HTML-Struktur
        html = driver.page_source
        if 'gameState === "question"' in html or 'question-screen' in html:
            print("✅ Question-Screen HTML gefunden")

        if 'type === "buzzer"' in html or 'buzzer-list' in html:
            print("✅ Buzzer-spezifisches HTML gefunden")

        # Schritt 8: Zusammenfassung
        print(f"\n{'='*70}")
        print("📊 ZUSAMMENFASSUNG")
        print(f"{'='*70}\n")
        print(f"Gesamt Logs: {len(logs_after)}")
        print(f"Errors: {len(errors)}")
        print(f"Warnings: {len(warnings)}")
        print(f"Body Length: {len(body_text)} Zeichen")

        # Kritische Errors?
        critical_errors = [e for e in errors if
                          'Cannot read' in e['message'] or
                          'undefined' in e['message'] or
                          'TypeError' in e['message']]

        if critical_errors:
            print(f"\n🔴 {len(critical_errors)} KRITISCHE FEHLER GEFUNDEN:")
            for err in critical_errors[:5]:  # Zeige max 5
                print(f"\n   {err['message'][:400]}")

        # Speichere Logs
        log_file = f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/logs-{test_name}.json'
        with open(log_file, 'w') as f:
            json.dump({
                'test': test_name,
                'url': base_url,
                'quiz_id': quiz_id,
                'logs_count': len(logs_after),
                'errors_count': len(errors),
                'warnings_count': len(warnings),
                'body_length': len(body_text),
                'has_question': "Was ist die Hauptstadt von Deutschland?" in body_text,
                'all_logs': logs_after,
                'errors': errors,
                'critical_errors': critical_errors
            }, f, indent=2)
        print(f"\n✅ Logs gespeichert: {log_file}")

        # Halte Browser offen
        print("\n⏰ Browser bleibt 10 Sekunden offen zum Inspizieren...")
        time.sleep(10)

    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

        # Error Screenshot
        try:
            driver.save_screenshot(f'/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots/EXCEPTION-{test_name}.png')
        except:
            pass

    finally:
        driver.quit()
        print("\n✅ Test abgeschlossen\n")

def main():
    import os
    os.makedirs('/Users/mytech/Downloads/MyTech Apps/quizer/test-screenshots', exist_ok=True)

    # Test Local
    test_host_only('http://localhost:5173/Quiz', 'LOCAL')

    # Test Online
    # test_host_only('http://if0-39705173.infinityfreeapp.com/Quiz', 'ONLINE')

if __name__ == '__main__':
    main()
